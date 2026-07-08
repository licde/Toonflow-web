<template>
  <div class="structured fc">
    <t-card :title="$t('workbench.production.wb.structuredTitle')" header-bordered class="panel">
      <p class="hint">{{ $t("workbench.production.wb.structuredHint") }}</p>
      <div class="row f ac">
        <input ref="fileInput" type="file" accept=".json,application/json" class="fileInput" @change="onFileChange" />
        <t-button size="small" variant="outline" @click="fileInput?.click()">
          {{ fileName || $t("workbench.production.wb.structuredPickJson") }}
        </t-button>
        <t-button size="small" @click="preview">{{ $t("workbench.production.wb.structuredPreview") }}</t-button>
        <t-button size="small" theme="primary" :loading="importing" @click="importJson">
          {{ $t("workbench.production.wb.structuredImport") }}
        </t-button>
        <t-button size="small" :loading="syncing" @click="syncJson">{{ $t("workbench.production.wb.structuredSync") }}</t-button>
      </div>
    </t-card>

    <t-card :title="$t('workbench.production.wb.structuredBatch')" header-bordered class="panel">
      <div class="row f ac">
        <t-button size="small" :loading="genImages" @click="genAllImages">{{ $t("workbench.production.wb.structuredGenImages") }}</t-button>
        <t-button size="small" :loading="genVideos" @click="genAllVideos">{{ $t("workbench.production.wb.structuredGenVideos") }}</t-button>
        <t-button size="small" variant="outline" @click="batchRun">{{ $t("workbench.production.wb.structuredBatchRun") }}</t-button>
        <t-button size="small" variant="outline" @click="assemble">{{ $t("workbench.production.wb.structuredAssemble") }}</t-button>
        <t-button size="small" variant="text" @click="refreshGrid">{{ $t("workbench.production.wb.structuredRefresh") }}</t-button>
        <t-checkbox v-model="audioOn">{{ $t("workbench.production.wb.structuredAudio") }}</t-checkbox>
      </div>
    </t-card>

    <t-card :title="gridTitle" header-bordered class="panel gridPanel">
      <div v-if="!shots.length" class="empty">{{ $t("workbench.production.wb.structuredEmpty") }}</div>
      <div v-else class="grid">
        <div v-for="s in shots" :key="s.id" class="card" :class="cardClass(s)">
          <img v-if="s.imageSrc" :src="s.imageSrc" alt="" />
          <div v-else class="placeholder" />
          <div class="meta">
            <span>#{{ s.镜号 ?? "-" }}</span>
            <span>{{ s.state }} · {{ s.duration }}s</span>
          </div>
          <div class="actions f">
            <t-button size="small" variant="text" :loading="busyId === s.id && busyAct === 'img'" @click="regen(s.id, 'img')">
              {{ $t("workbench.production.wb.structuredRegenImage") }}
            </t-button>
            <t-button size="small" variant="text" :loading="busyId === s.id && busyAct === 'vid'" @click="regen(s.id, 'vid')">
              {{ $t("workbench.production.wb.structuredRegenVideo") }}
            </t-button>
          </div>
        </div>
      </div>
    </t-card>

    <pre v-if="logText" class="log">{{ logText }}</pre>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
import { MessagePlugin } from "tdesign-vue-next";

type ShotCard = {
  id: number;
  镜号?: number;
  state?: string;
  duration?: number;
  imageSrc?: string;
};

const { project } = storeToRefs(projectStore());
const episodesId = inject<Ref<number>>("episodesId")!;

const fileInput = ref<HTMLInputElement | null>(null);
const cachedJson = ref<Record<string, unknown> | null>(null);
const fileName = ref("");
const shots = ref<ShotCard[]>([]);
const storyboardIds = ref<number[]>([]);
const logText = ref("");
const audioOn = ref(true);
const importing = ref(false);
const syncing = ref(false);
const genImages = ref(false);
const genVideos = ref(false);
const busyId = ref(0);
const busyAct = ref<"" | "img" | "vid">("");

const gridTitle = computed(() =>
  shots.value.length
    ? `${window.$t("workbench.production.wb.structuredGrid")} (${shots.value.length})`
    : window.$t("workbench.production.wb.structuredGrid"),
);

function projectId() {
  return Number(project.value?.id);
}

function scriptId() {
  return episodesId.value;
}

function log(obj: unknown) {
  logText.value = typeof obj === "string" ? obj : JSON.stringify(obj, null, 2);
}

async function structuredApi<T = unknown>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = (await axios.post(`/structured/${path}`, body)) as { code?: number; data?: T; message?: string };
  if (res.code !== 200 && res.code !== 0) throw new Error(res.message || "请求失败");
  return res.data as T;
}

function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  fileName.value = file.name;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      cachedJson.value = JSON.parse(String(reader.result));
    } catch {
      MessagePlugin.error(window.$t("workbench.production.wb.structuredJsonInvalid"));
    }
  };
  reader.readAsText(file);
}

async function refreshGrid() {
  const sid = scriptId();
  if (!sid) return MessagePlugin.warning(window.$t("workbench.production.selectPlaceholder"));
  const data = await structuredApi<{ shots: ShotCard[] }>("getStructuredGrid", {
    projectId: projectId(),
    scriptId: sid,
  });
  shots.value = data.shots ?? [];
  storyboardIds.value = shots.value.map((s) => s.id);
}

async function preview() {
  if (!cachedJson.value) return MessagePlugin.warning(window.$t("workbench.production.wb.structuredPickJson"));
  try {
    const data = await structuredApi("previewStructured", { json: cachedJson.value, episodeIndex: 0 });
    log(data);
  } catch (e: any) {
    MessagePlugin.error(e.message);
  }
}

async function importJson() {
  if (!cachedJson.value) return MessagePlugin.warning(window.$t("workbench.production.wb.structuredPickJson"));
  importing.value = true;
  try {
    const data = await structuredApi<{ storyboardIds: number[] }>("importStructured", {
      projectId: projectId(),
      json: cachedJson.value,
      episodeIndex: 0,
    });
    storyboardIds.value = data.storyboardIds ?? [];
    log(data);
    MessagePlugin.success(window.$t("workbench.production.wb.structuredImportOk"));
    await refreshGrid();
  } catch (e: any) {
    MessagePlugin.error(e.message);
  } finally {
    importing.value = false;
  }
}

async function syncJson() {
  if (!cachedJson.value) return MessagePlugin.warning(window.$t("workbench.production.wb.structuredPickJson"));
  const sid = scriptId();
  if (!sid) return MessagePlugin.warning(window.$t("workbench.production.selectPlaceholder"));
  syncing.value = true;
  try {
    const data = await structuredApi("syncStructured", {
      projectId: projectId(),
      scriptId: sid,
      json: cachedJson.value,
    });
    log(data);
    await refreshGrid();
  } catch (e: any) {
    MessagePlugin.error(e.message);
  } finally {
    syncing.value = false;
  }
}

async function genAllImages() {
  if (!storyboardIds.value.length) await refreshGrid();
  if (!storyboardIds.value.length) return;
  genImages.value = true;
  try {
    const data = await structuredApi("generateShotImage", {
      projectId: projectId(),
      storyboardIds: storyboardIds.value,
      tier: project.value?.imageQuality || "2K",
    });
    log(data);
    await refreshGrid();
  } catch (e: any) {
    MessagePlugin.error(e.message);
  } finally {
    genImages.value = false;
  }
}

async function genAllVideos() {
  if (!storyboardIds.value.length) await refreshGrid();
  if (!storyboardIds.value.length) return;
  genVideos.value = true;
  try {
    const data = await structuredApi("generateShotVideo", {
      projectId: projectId(),
      storyboardIds: storyboardIds.value,
      audio: audioOn.value,
    });
    log(data);
    await refreshGrid();
  } catch (e: any) {
    MessagePlugin.error(e.message);
  } finally {
    genVideos.value = false;
  }
}

async function batchRun() {
  const sid = scriptId();
  if (!sid) return MessagePlugin.warning(window.$t("workbench.production.selectPlaceholder"));
  try {
    await structuredApi("batchGenerateFromStructured", {
      projectId: projectId(),
      scriptId: sid,
      audio: audioOn.value,
      phases: ["variants", "images", "videos"],
    });
    MessagePlugin.info(window.$t("workbench.production.wb.structuredBatchStarted"));
  } catch (e: any) {
    MessagePlugin.error(e.message);
  }
}

async function assemble() {
  const sid = scriptId();
  if (!sid) return MessagePlugin.warning(window.$t("workbench.production.selectPlaceholder"));
  try {
    const data = await structuredApi("assembleEpisode", {
      projectId: projectId(),
      scriptId: sid,
      skipConcat: false,
    });
    log(data);
  } catch (e: any) {
    MessagePlugin.error(e.message);
  }
}

async function regen(id: number, act: "img" | "vid") {
  busyId.value = id;
  busyAct.value = act;
  try {
    await structuredApi("regenerateShot", {
      projectId: projectId(),
      storyboardId: id,
      targets: act === "img" ? ["image"] : ["video"],
      tier: project.value?.imageQuality || "2K",
      audio: audioOn.value,
    });
    await refreshGrid();
  } catch (e: any) {
    MessagePlugin.error(e.message);
  } finally {
    busyId.value = 0;
    busyAct.value = "";
  }
}

function cardClass(s: ShotCard) {
  if (s.state === "dirty") return "dirty";
  if (s.state === "已完成") return "done";
  return "";
}

onMounted(() => {
  if (scriptId()) refreshGrid().catch(() => {});
});
</script>

<style lang="scss" scoped>
.structured {
  gap: 12px;
  padding: 12px;
  height: 100%;
  overflow: auto;
}
.panel {
  flex-shrink: 0;
}
.hint {
  margin: 0 0 10px;
  color: var(--td-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.row {
  gap: 8px;
  flex-wrap: wrap;
}
.fileInput {
  display: none;
}
.gridPanel {
  flex: 1;
  min-height: 200px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
}
.card {
  border: 1px solid var(--td-component-border);
  border-radius: 6px;
  padding: 6px;
  img,
  .placeholder {
    width: 100%;
    aspect-ratio: 9/16;
    object-fit: cover;
    border-radius: 4px;
    background: var(--td-bg-color-component);
  }
  &.dirty {
    border-color: #e8a317;
  }
  &.done {
    border-color: #34a853;
  }
}
.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-top: 4px;
}
.actions {
  gap: 4px;
  flex-wrap: wrap;
}
.log {
  max-height: 160px;
  overflow: auto;
  font-size: 12px;
  background: var(--td-bg-color-component);
  padding: 8px;
  border-radius: 4px;
  margin: 0;
}
.empty {
  color: var(--td-text-color-placeholder);
  text-align: center;
  padding: 24px;
}
</style>
