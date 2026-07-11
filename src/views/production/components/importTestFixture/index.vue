<template>
  <t-dialog
    v-model:visible="visible"
    :header="$t('workbench.production.importFixture.title')"
    :width="720"
    :confirm-btn="$t('workbench.production.importFixture.confirm')"
    :cancel-btn="$t('workbench.production.cancel')"
    :confirm-loading="loading"
    @confirm="onConfirm"
    @close="onClose">
    <div class="importFixture">
      <p class="hint">{{ $t("workbench.production.importFixture.hint") }}</p>
      <t-textarea v-model="jsonText" :placeholder="$t('workbench.production.importFixture.placeholder')" :autosize="{ minRows: 12, maxRows: 20 }" />
      <div class="actions f ac">
        <t-upload :auto-upload="false" accept=".json,application/json" :show-upload-list="false" @change="onFileChange">
          <t-button size="small" variant="outline">{{ $t("workbench.production.importFixture.upload") }}</t-button>
        </t-upload>
        <t-checkbox v-model="syncPackage">{{ $t("workbench.production.importFixture.syncPackage") }}</t-checkbox>
        <t-checkbox v-model="runCompile">{{ $t("workbench.production.importFixture.runCompile") }}</t-checkbox>
      </div>
    </div>
  </t-dialog>
</template>

<script setup lang="ts">
import { ref } from "vue";
import type { UploadFile } from "tdesign-vue-next";
import productionAgentStore from "@/stores/productionAgent";
import type { FlowData } from "@/views/production/utils/flowBuilder";
import { compileDryRun, saveEpisodePackageRaw, syncEpisodePackage } from "@/utils/ruleEngine";
import type { EpisodePackage } from "@/types/ruleEngine";

const props = defineProps<{
  projectId: number;
  scriptId?: number;
}>();

const emit = defineEmits<{
  imported: [];
}>();

const visible = defineModel<boolean>("visible", { default: false });
const jsonText = ref("");
const syncPackage = ref(true);
const runCompile = ref(false);
const loading = ref(false);

function stripMeta(obj: Record<string, unknown>) {
  const { _comment, ...rest } = obj;
  return rest;
}

function parseImportPayload(text: string): { flowData: Partial<FlowData>; package?: EpisodePackage } {
  const raw = JSON.parse(text) as Record<string, unknown>;
  if (!raw || typeof raw !== "object") throw new Error("invalid json");

  if (raw.flowData && typeof raw.flowData === "object") {
    const flowData = stripMeta(raw.flowData as Record<string, unknown>) as Partial<FlowData>;
    const pkg = raw.package && typeof raw.package === "object" ? (stripMeta(raw.package as Record<string, unknown>) as EpisodePackage) : undefined;
    return { flowData, package: pkg };
  }

  const pkg = raw.package && typeof raw.package === "object" ? (stripMeta(raw.package as Record<string, unknown>) as EpisodePackage) : undefined;
  const flowData = stripMeta(raw) as Partial<FlowData>;
  delete (flowData as Record<string, unknown>).package;
  return { flowData, package: pkg };
}

function onFileChange(files: UploadFile[]) {
  const file = files[0]?.raw;
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    jsonText.value = String(reader.result ?? "");
  };
  reader.readAsText(file);
}

function onClose() {
  jsonText.value = "";
}

async function onConfirm() {
  if (!props.scriptId) {
    window.$message.warning($t("workbench.production.importFixture.noEpisode"));
    return;
  }
  if (!jsonText.value.trim()) {
    window.$message.warning($t("workbench.production.importFixture.empty"));
    return;
  }

  loading.value = true;
  try {
    const { flowData: imported, package: pkgBody } = parseImportPayload(jsonText.value);
    const store = productionAgentStore();
    Object.assign(store.flowData, imported);
    await store.setFlowData(props.scriptId);

    const body = {
      projectId: props.projectId,
      scriptId: props.scriptId,
      script: store.flowData.script,
      scriptPlan: store.flowData.scriptPlan,
      storyboardTable: store.flowData.storyboardTable,
      storyboard: store.flowData.storyboard,
    };

    if (pkgBody) {
      await saveEpisodePackageRaw({ ...body, package: pkgBody });
    } else if (syncPackage.value) {
      await syncEpisodePackage(body);
    }

    if (runCompile.value) {
      await compileDryRun(body);
    }

    window.$message.success($t("workbench.production.importFixture.success"));
    visible.value = false;
    emit("imported");
  } catch (e) {
    window.$message.error((e as Error)?.message || $t("workbench.production.importFixture.failed"));
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped lang="scss">
.importFixture {
  .hint {
    margin: 0 0 8px;
    font-size: 12px;
    color: var(--td-text-color-secondary);
  }
  .actions {
    gap: 12px;
    margin-top: 12px;
    flex-wrap: wrap;
  }
}
</style>
