<template>
  <t-card class="storyboard">
    <div class="titleBar dragHandle pr">
      <div class="title">{{ $t("workbench.production.node.storyboard.title") }}</div>
      <Handle :id="props.handleIds.target" type="target" :position="Position.Left" style="left: calc(-1 * var(--td-comp-paddingLR-xl))" />
      <Handle :id="props.handleIds.source" type="source" :position="Position.Right" style="right: calc(-1 * var(--td-comp-paddingLR-xl))" />
    </div>
    <div class="content">
      <t-empty v-if="!storyboard.length" style="margin-top: 16px"></t-empty>
      <t-checkbox-group v-model="selectedIds">
        <div class="frameGrid">
          <template v-for="(item, index) in storyboard" :key="item.id">
            <div class="frameItem" @mouseenter="setHoveredFrame(index)" @mouseleave="setHoveredFrame(null)">
              <div class="addBetween addBetween--left" :class="{ expanded: hoveredIndex === index }">
                <t-button
                  theme="primary"
                  variant="outline"
                  shape="circle"
                  @click.stop="editStoryboaryImage(item, [index > 0 ? storyboard[index - 1]?.src || '' : '', item.src || ''], index - 1)">
                  <template #icon><i-plus /></template>
                </t-button>
              </div>

              <div class="frameCard">
                <div
                  class="frameImage"
                  :style="{
                    width: `${200 * gridScale}px`,
                    height: `${200 * gridScale}px`,
                  }">
                  <div class="ac frameCheckbox" :style="{ transform: `scale(${styleMaxSize})` }">
                    <t-checkbox :checked="selectedIds.includes(item.id!)" @click.stop :key="item?.id || index" :value="item.id" />
                    <t-tag class="frameTypeTag" :style="{ backgroundColor: tagColors[index % tagColors.length] }">
                      S{{ String(index + 1).padStart(2, "0") }}
                    </t-tag>
                  </div>

                  <t-image
                    v-if="item.src && item.state == '已完成'"
                    :src="item.src"
                    fit="contain"
                    class="frameImg"
                    @click="editStoryboaryImage(item, [item.src])">
                    <template #overlayContent>
                      <div class="imageToolsWrap show">
                        <ImageTools :style="{ transform: `scale(${styleMaxSize})` }" :src="item.src" position="br" />
                      </div>
                      <t-tag
                        v-if="isWeakKeepStill(item)"
                        size="small"
                        theme="warning"
                        variant="light"
                        class="frameWeakTag"
                        :style="{ transform: `scale(${styleMaxSize})` }"
                      >
                        {{ stillFrameBadge(item) }}
                      </t-tag>
                    </template>
                  </t-image>
                  <div v-else class="generatingPlaceholder" @click="editStoryboaryImage(item, [])">
                    <t-loading v-if="item.state === '生成中'" size="small" />
                    <t-tooltip v-else-if="item.state == '生成失败'" :content="item?.reason">
                      <span style="color: #ff4d4f">生成失败</span>
                    </t-tooltip>
                    <t-empty v-else size="small" :title="$t('workbench.production.node.storyboard.notGenerated')" />
                  </div>
                  <t-tooltip theme="primary" :content="$t('workbench.production.node.storyboard.deleteNode')">
                    <div class="remove ac" :style="{ transform: `scale(${styleMaxSize})` }" @click.stop="removeFn(item.id!)">
                      <i-delete theme="outline" size="18" fill="#fff" />
                    </div>
                  </t-tooltip>
                  <t-tooltip theme="primary" :content="$t('workbench.production.node.storyboard.editNode')">
                    <div class="editNode ac" :style="{ transform: `scale(${styleMaxSize})` }" @click.stop="editInfo(item)">
                      <i-edit theme="outline" size="18" fill="#fff" />
                    </div>
                  </t-tooltip>
                </div>
              </div>
              <div class="addBetween addBetween--right" :class="{ expanded: hoveredIndex === index }">
                <t-button
                  theme="primary"
                  variant="outline"
                  shape="circle"
                  @click.stop="
                    editStoryboaryImage(item, [item.src || '', index < (storyboard?.length ?? 0) - 1 ? storyboard[index + 1]?.src || '' : ''], index)
                  ">
                  <template #icon><i-plus /></template>
                </t-button>
              </div>
            </div>
          </template>
        </div>
      </t-checkbox-group>

      <div class="scaleControl">
        <span>{{ $t("workbench.production.node.storyboard.scaleRatio") }}</span>
        <t-input-number v-model="gridScale" :min="0.1" :max="3" :step="0.1" :decimal-places="1" size="small" style="width: 120px" />
      </div>
      <div class="ac" style="gap: 6px; margin-bottom: 6px; flex-wrap: wrap">
        <t-tag theme="primary" variant="light">{{ $t("workbench.production.node.storyboard.selectedCount", { count: selectedIds.length }) }}</t-tag>
        <t-button size="small" :disabled="!storyboard.length" theme="default" variant="outline" @click="selectedIds = []">
          {{ $t("workbench.production.node.storyboard.clearSelection") }}
        </t-button>
        <t-button size="small" :disabled="!storyboard.length" theme="default" variant="outline" @click="selectAll">
          {{ $t("workbench.production.node.storyboard.selectAll") }}
        </t-button>
        <t-button theme="danger" size="small" :disabled="!storyboard.length || !selectedIds.length" @click="handleDeleteSelected">批量删除</t-button>
      </div>
      <div class="ac" style="gap: 10px">
        <t-button block @click="previewAll" :disabled="!storyboard.length">{{ $t("workbench.production.node.storyboard.gridPreview") }}</t-button>
        <t-button
          block
          theme="default"
          variant="outline"
          @click="batchComposePrompts"
          :disabled="!storyboard.length || !selectedIds.length"
          :loading="composeLoading"
        >
          批量补全提示词（测试）
        </t-button>
        <t-button block @click="batchGenerateImage" :disabled="!storyboard.length || !selectedIds.length" :loading="generateLoading">
          {{ $t("workbench.production.node.storyboard.generateImage") }}
        </t-button>

        <!-- <t-button block @click="batchGenerateImage" :disabled="!storyboard.length" :loading="generateLoading">
          {{ $t("workbench.production.node.storyboard.batchGenerateImage") }}
        </t-button> -->
      </div>
    </div>
    <editImage v-model="visible" v-if="visible" :flowData="currentRow" type="storyboard" @save="save" />
    <t-image-viewer
      v-model:visible="previewVisible"
      v-if="previewVisible"
      :images="previewImages"
      :onClose="closePreview"
      :onDownload="downLoadImage"
      :imageScale="{ max: 10, min: 0.1 }" />
  </t-card>
</template>

<script setup lang="ts">
import { useLocalStorage } from "@vueuse/core";
import editImage from "../components/editImage/index.vue";
import { LoadingPlugin } from "tdesign-vue-next";
import { Handle, Position, type Edge } from "@vue-flow/core";
import axios from "@/utils/axios";
import type { AssetItem, DeriveAsset, Storyboard } from "../utils/flowBuilder";
import projectStore from "@/stores/project";
import productionAgentStore from "@/stores/productionAgent";
import { parsePromptRefs } from "@/utils/promptRefs";
import { stillQualityBadgeLabel, type StillMeta } from "@/types/stillQuality";

function isWeakKeepStill(item: Storyboard): boolean {
  return item.stateHint === "weak_keep" || item.stillQuality === "weak" || item.visualPass === false;
}

function stillFrameBadge(item: Storyboard): string {
  return stillQualityBadgeLabel({
    stillQuality: item.stillQuality,
    visualPass: item.visualPass,
  } as StillMeta);
}
const { project } = storeToRefs(projectStore());
const { episodesId } = storeToRefs(productionAgentStore());

const props = defineProps<{
  id: string;
  handleIds: {
    target: string;
    source: string;
  };
  assetsData: AssetItem[];
}>();

const storyboard = defineModel<Storyboard[]>({ required: true });

const visible = ref(false);
const previewVisible = ref(false);
const previewImages = ref<string[]>([]);
const gridScale = useLocalStorage("storyboardGridScale", 1);

const hoveredIndex = ref<number | null>(null);
const selectedIds = ref<number[]>([]);

function setHoveredFrame(index: number | null) {
  hoveredIndex.value = index;
}

function selectAll() {
  selectedIds.value = storyboard.value.map((s) => s.id!).filter(Boolean);
}
function handleDeleteSelected() {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.production.node.storyboard.confirmBatchDeleteBody", { index: selectedIds.value.length }),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      try {
        if (!selectedIds.value.length) {
          dialog.destroy();
          return window.$message.error($t("workbench.production.node.storyboard.pleaseSelectImage"));
        }
        axios.post("/production/storyboard/batchDelete", {
          ids: selectedIds.value,
          projectId: project.value?.id,
        });
        storyboard.value = storyboard.value.filter((i) => !selectedIds.value.includes(i.id!));
        selectedIds.value = [];
        window.$message.success($t("workbench.production.node.storyboard.deleteSuccess"));
      } catch (e) {
        window.$message.error((e as any)?.message || $t("workbench.production.node.storyboard.removeFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}
const currentRow = ref<{
  flowId?: number | null;
  resultImages: { src: string; prompt: string }[];
  referanceImages: string[];
}>({
  flowId: null,
  resultImages: [],
  referanceImages: [],
});

const tagColors = ["#5bccb3", "#9c7cfc", "#fbbf24", "#5b9afc", "#e86b6b", "#7cb8fc", "#e8a855", "#34d399"];

function closePreview() {
  previewImages.value = [];
}
async function downLoadImage() {
  LoadingPlugin(true);
  const allIds = (storyboard.value ?? []).filter((s) => s.src).map((s) => s.id!);
  if (!allIds.length) {
    window.$message.warning($t("workbench.production.node.storyboard.noPreviewImages"));
    LoadingPlugin(false);
    return;
  }
  try {
    const res = await axios.post(
      "/production/storyboard/downPreviewImage",
      {
        storyboardIds: allIds,
      },
      { responseType: "blob" },
    );
    // 创建下载链接
    const url = URL.createObjectURL(res as unknown as Blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storyboardImagePreview-${Date.now()}.png`;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    window.$message.error($t("workbench.production.node.storyboard.imageLoadFailed"));
  } finally {
    LoadingPlugin(false);
  }
}
async function previewAll() {
  LoadingPlugin(true);
  const allIds = (storyboard.value ?? []).filter((s) => s.src).map((s) => s.id!);
  if (!allIds.length) {
    window.$message.warning($t("workbench.production.node.storyboard.noPreviewImages"));
    LoadingPlugin(false);
    return;
  }
  try {
    const { data } = await axios.post("/production/storyboard/previewImage", {
      storyboardIds: allIds,
      projectId: project.value?.id,
    });
    previewImages.value = [data];
    previewVisible.value = true;
  } catch {
    window.$message.error($t("workbench.production.node.storyboard.imageLoadFailed"));
  } finally {
    LoadingPlugin(false);
  }
}
const currentRowStoryboardInfo = ref<{ id: number | null; insertAfterIndex: number | null }>({
  id: null,
  insertAfterIndex: null,
});
const styleMaxSize = computed(() => {
  if (gridScale.value <= 1) return gridScale.value;
  else 1;
});
const generateLoading = ref(false);
const composeLoading = ref(false);
async function batchComposePrompts(opts?: { silent?: boolean }) {
  if (!selectedIds.value.length) return window.$message.warning("请先选择分镜面板");
  composeLoading.value = true;
  try {
    const { data } = await axios.post("/production/storyboard/batchComposeStillPrompt", {
      projectId: project.value?.id,
      scriptId: episodesId.value,
      storyboardIds: selectedIds.value,
      mode: "full",
    });
    const body = data?.data ?? data;
    const results = body?.results ?? [];
    for (const r of results) {
      if (!r?.ok || !r.prompt) continue;
      const row = storyboard.value.find((s) => s.id === r.storyboardId);
      if (row) row.prompt = r.prompt;
    }
    if (!opts?.silent) {
      window.$message.success(body?.userMessage || `已补全 ${results.filter((r: { ok: boolean }) => r.ok).length} 条提示词`);
    }
  } catch (e: any) {
    window.$message.error(e?.response?.data?.data?.userMessage || e?.message || "批量补全失败");
    throw e;
  } finally {
    composeLoading.value = false;
  }
}
async function batchGenerateImage() {
  if (!selectedIds.value.length) return window.$message.warning("请先选择分镜面板");
  generateLoading.value = true;
  try {
    // BE batchGenerateImage 内已静默 compose + hq；勿再前置 batchCompose（曾误挡缺定妆）
    await productionAgentStore().batchGenerateStoryboard(selectedIds.value, true);
    window.$message.success($t("workbench.production.node.storyboard.batchGenerateSuccess"));
    selectedIds.value = [];
  } catch (e: any) {
    window.$message.error(e?.response?.data?.data?.userMessage || $t("workbench.production.node.storyboard.batchGenerateFailed"));
  } finally {
    generateLoading.value = false;
  }
}
function resolveAssetSrc(id: number): string | undefined {
  const asset = props.assetsData.find((a) => a.id === id);
  if (asset?.src) return asset.src;
  for (const a of props.assetsData) {
    const derive = a.derive?.find((d) => d.id === id);
    if (derive?.src) return derive.src;
  }
  return undefined;
}

function assetMatchesCode(asset: AssetItem, code: string): boolean {
  const codeTag = `charCode:${code}`;
  const suffix = code.replace(/^CHAR-/, "");
  return (
    asset.remark === codeTag ||
    Boolean(asset.remark?.includes(codeTag)) ||
    asset.name === code ||
    Boolean(asset.name?.includes(suffix)) ||
    Boolean(asset.prompt?.includes(code)) ||
    Boolean(asset.desc?.includes(code))
  );
}

function findAssetById(id: number): AssetItem | DeriveAsset | undefined {
  const asset = props.assetsData.find((a) => a.id === id);
  if (asset) return asset;
  for (const a of props.assetsData) {
    const derive = a.derive?.find((d) => d.id === id);
    if (derive) return derive;
  }
  return undefined;
}

function isCodeLinkedToPanel(code: string, linkedIds: number[]): boolean {
  for (const id of linkedIds) {
    const hit = findAssetById(id);
    if (hit && "derive" in hit && assetMatchesCode(hit, code)) return true;
    if (hit && !("derive" in hit)) {
      const parent = props.assetsData.find((a) => a.derive?.some((d) => d.id === id));
      if (parent && assetMatchesCode(parent, code)) return true;
    }
  }
  return false;
}

function resolveAssetByCode(code: string): AssetItem | undefined {
  const codeTag = `charCode:${code}`;
  const suffix = code.replace(/^CHAR-/, "");
  return props.assetsData.find(
    (a) =>
      a.remark === codeTag ||
      a.remark?.includes(codeTag) ||
      a.name === code ||
      a.name?.includes(suffix) ||
      a.prompt?.includes(code) ||
      a.desc?.includes(code),
  );
}

function editStoryboaryImage(item: Storyboard, images: string[], insertAfterIndex: number | null = null) {
  currentRowStoryboardInfo.value = {
    id: insertAfterIndex == null ? item?.id! : null,
    insertAfterIndex,
  };
  currentRow.value = {
    flowId: item?.flowId ?? null,
    resultImages: [],
    referanceImages: [],
    storyboardId: item?.id,
  };

  if (currentRowStoryboardInfo.value.id) {
    let imagesPush: string[] = [];
    const warnMsgs: string[] = [];

    if (item.associateAssetsIds && item.associateAssetsIds.length > 0) {
      for (const id of item.associateAssetsIds) {
        const src = resolveAssetSrc(id);
        if (src) imagesPush.push(src);
        else {
          const hit = findAssetById(id);
          warnMsgs.push(`请先生成角色参考图：${hit?.name ?? id}`);
        }
      }
    }

    const refs = parsePromptRefs(item.prompt ?? "");
    const linkedIds = item.associateAssetsIds ?? [];
    for (const code of [...refs.crefs, ...refs.srefs]) {
      if (isCodeLinkedToPanel(code, linkedIds)) continue;
      const asset = resolveAssetByCode(code);
      if (!asset) {
        warnMsgs.push(`未找到 cref ${code}`);
        continue;
      }
      if (asset.src && !imagesPush.includes(asset.src)) imagesPush.push(asset.src);
      else if (!asset.src) warnMsgs.push(`请先生成角色参考图：${asset.name ?? code}`);
    }

    for (const w of item.referenceWarnings ?? []) warnMsgs.push(w.message);
    if (warnMsgs.length) window.$message.warning(warnMsgs.slice(0, 3).join("；"));

    currentRow.value.referanceImages = imagesPush;
    currentRow.value.resultImages = [{ src: images.length ? images[0] : "", prompt: item.prompt ?? "" }];
  } else {
    currentRow.value.referanceImages = images.filter(Boolean);
  }
  visible.value = true;
}

async function save({ imageUrl, flowId }: { imageUrl: string; flowId: number }) {
  if (!imageUrl) return;

  const { id, insertAfterIndex } = currentRowStoryboardInfo.value;

  // 插入模式：在两张图之间新增一条分镜
  if (id === null && insertAfterIndex !== null) {
    const newFrame: Storyboard = {
      duration: 0,
      prompt: "",
      src: imageUrl,
      videoDesc: "",
      shouldGenerateImage: 1,
      state: "已完成",
      // Insert keep has no L1 visualPass — do not present as burnable HQ
      stillQuality: "weak",
      visualPass: false,
      stateHint: "weak_keep",
      ctaLabel: "重新高质量生成",
    };
    const { data } = await axios.post("/production/storyboard/addStoryboard", {
      ...newFrame,
      projectId: project.value?.id,
      scriptId: episodesId.value,
      flowId,
    });

    storyboard.value.splice(insertAfterIndex + 1, 0, { ...newFrame, id: data.id!, flowId });
    productionAgentStore().setFlowData();
    return;
  }

  // 更新模式：src 先写，质量态必须跟 BE（不可本地伪造 HQ）
  const target = storyboard.value.find((s) => s.id === id);
  if (target) {
    target.src = imageUrl;
    target.state = "已完成";
    target.flowId = flowId;
  }
  const res = await axios.post("/production/storyboard/updateStoryboardUrl", {
    id: id,
    url: imageUrl,
    flowId,
    qualityMode: "hq_update",
  });
  const body = (res as { data?: Record<string, unknown> })?.data ?? (res as Record<string, unknown>);
  if (target && body && typeof body === "object") {
    if (body.stillQuality != null) target.stillQuality = body.stillQuality as Storyboard["stillQuality"];
    if (body.visualPass != null) target.visualPass = Boolean(body.visualPass);
    if (body.stateHint != null) target.stateHint = String(body.stateHint);
    if (body.ctaLabel != null) target.ctaLabel = String(body.ctaLabel);
    if (body.userMessage != null) target.userMessage = String(body.userMessage);
    if (body.primaryNextStep != null) target.primaryNextStep = String(body.primaryNextStep);
    if (body.stateHint === "weak_keep" || body.stillQuality === "weak") {
      window.$message?.warning?.(
        String(body.userMessage || body.ctaLabel || "外源/保留图未经验收，未标高质量"),
      );
    }
  }
}

async function removeFn(id: number) {
  const dialog = DialogPlugin.confirm({
    header: $t("workbench.assets.confirmDeleteHeader"),
    body: $t("workbench.production.node.storyboard.confirmDeleteBody"),
    confirmBtn: $t("workbench.assets.deleteBtn"),
    cancelBtn: $t("workbench.assets.cancelBtn"),
    theme: "warning",
    onConfirm: async () => {
      if (!id) {
        const index = storyboard.value.findIndex((s) => s.id === id);
        if (index !== -1) {
          storyboard.value.splice(index, 1);
        }
        dialog.destroy();
        return;
      }
      try {
        await axios.post("/production/storyboard/removeFrame", {
          id,
          projectId: project.value?.id,
        });
        const index = storyboard.value.findIndex((s) => s.id === id);
        if (index !== -1) {
          storyboard.value.splice(index, 1);
        }
      } catch (e) {
        window.$message.error((e as any)?.message || $t("workbench.production.node.storyboard.removeFailed"));
      } finally {
        dialog.destroy();
      }
    },
  });
}

function editInfo(item: Storyboard) {
  const formData = reactive({
    prompt: item.prompt ?? "",
    videoDesc: item?.videoDesc ?? "",
    audioPrompt: item?.audioPrompt ?? "",
    fxPrompt: item?.fxPrompt ?? "",
  });

  const bodyVNode = () =>
    h("div", { class: "editInfoForm" }, [
      h("div", { class: "editInfoField" }, [
        h("label", { class: "editInfoLabel" }, $t("workbench.production.node.storyboard.prompt")),
        h(resolveComponent("t-textarea"), {
          value: formData.prompt,
          placeholder: $t("workbench.production.node.storyboard.promptPlaceholder"),
          autosize: { minRows: 3, maxRows: 6 },
          "onUpdate:value": (v: string) => (formData.prompt = v),
        }),
      ]),
      h("div", { class: "editInfoField" }, [
        h("label", { class: "editInfoLabel" }, $t("workbench.production.node.storyboard.videoDesc")),
        h(resolveComponent("t-textarea"), {
          value: formData.videoDesc,
          placeholder: $t("workbench.production.node.storyboard.videoDescPlaceholder"),
          autosize: { minRows: 3, maxRows: 6 },
          "onUpdate:value": (v: string) => (formData.videoDesc = v),
        }),
      ]),
      h("div", { class: "editInfoField" }, [
        h("label", { class: "editInfoLabel" }, "audioPrompt"),
        h(resolveComponent("t-textarea"), {
          value: formData.audioPrompt,
          placeholder: "AUD",
          autosize: { minRows: 2, maxRows: 4 },
          "onUpdate:value": (v: string) => (formData.audioPrompt = v),
        }),
      ]),
      h("div", { class: "editInfoField" }, [
        h("label", { class: "editInfoLabel" }, "fxPrompt"),
        h(resolveComponent("t-textarea"), {
          value: formData.fxPrompt,
          placeholder: "FX",
          autosize: { minRows: 2, maxRows: 4 },
          "onUpdate:value": (v: string) => (formData.fxPrompt = v),
        }),
      ]),
    ]);

  const confirmDialog = DialogPlugin.confirm({
    header: $t("workbench.production.node.storyboard.editInfo"),
    body: bodyVNode,
    width: 480,
    confirmBtn: {
      content: $t("common.submit"),
      theme: "primary",
      loading: false,
    },
    onConfirm: async () => {
      confirmDialog.update({ confirmBtn: { content: $t("common.submitting"), loading: true } });
      try {
        await axios.post("/production/storyboard/editStoryboardInfo", {
          id: item.id,
          prompt: formData.prompt,
          videoDesc: formData.videoDesc,
        });
        item.prompt = formData.prompt;
        item.videoDesc = formData.videoDesc;
        item.audioPrompt = formData.audioPrompt;
        item.fxPrompt = formData.fxPrompt;
        await productionAgentStore().setFlowData();
        window.$message.success($t("common.editSuccess"));
      } catch (e) {
        window.$message.error((e as any)?.message || $t("common.editFailed"));
      } finally {
        confirmDialog.update({ confirmBtn: { content: $t("common.submit"), loading: false } });
        confirmDialog.destroy();
      }
    },
  });
}
</script>

<style lang="scss" scoped>
.storyboard {
  min-width: 500px;
  max-width: 100vw;
  user-select: text;
  cursor: default;

  .titleBar {
    cursor: grab;
    user-select: none;
  }
  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .content {
    margin-top: 12px;
  }

  .frameGrid {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0;
  }

  .frameItem {
    position: relative;
    display: inline-flex;
    align-items: flex-start;
    margin: 4px;
  }

  .addBetween {
    position: absolute;
    z-index: 10;
    top: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    span {
      line-height: 1;
      white-space: nowrap;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    &.expanded {
      opacity: 1;
      pointer-events: auto;
    }
    &:hover {
      // background: var(--td-brand-color);
      // color: #fff;
      // transform: scale(1.15);
    }
    &--left {
      transform: translate(calc(-50% - 4px), -50%);
    }
    &--right {
      transform: translate(calc(50% + 4px), -50%);
      right: 0;
    }
  }

  .frameCard {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    transition:
      transform 0.2s,
      box-shadow 0.2s;
  }

  .frameImage {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
    transition: opacity 0.2s ease;
    &:hover {
      .remove,
      .editNode {
        opacity: 1;
      }
    }
    .remove {
      position: absolute;
      top: 3px;
      right: 3px;
      z-index: 9999;
      padding: 5px;
      border-radius: 10px;
      background-color: rgba(220, 50, 50, 0.7);
      cursor: pointer;
      opacity: 0;
      transform-origin: top right;
      &:hover {
        background-color: rgba(220, 50, 50, 1);
      }
    }
    .editNode {
      position: absolute;
      bottom: 3px;
      left: 3px;
      z-index: 9999;
      padding: 5px;
      border-radius: 10px;
      background-color: rgba(24, 144, 255, 0.7);
      cursor: pointer;
      transform-origin: bottom left;
      opacity: 0;
      &:hover {
        background-color: rgba(24, 144, 255, 1);
      }
    }
  }

  .generatingPlaceholder {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    background-color: var(--td-bg-color-container-hover, #f5f5f5);
    font-size: 12px;
  }

  .frameImg {
    width: 100%;
    height: 100%;
    object-fit: cover;
    .imageToolsWrap {
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    &:hover {
      .imageToolsWrap {
        opacity: 1;
        pointer-events: auto;
      }
    }
  }

  .frameCheckbox {
    position: absolute;
    left: 3px;
    top: 3px;
    z-index: 3;
    transform-origin: top left;
  }

  .frameTypeTag {
    color: #fff;
    font-size: 10px;
    font-weight: 600;
    border: none;
    z-index: 2;
    padding: 0 4px;
    line-height: 18px;
    border-radius: 3px;
  }

  .frameWeakTag {
    position: absolute;
    left: 6px;
    bottom: 6px;
    z-index: 4;
    transform-origin: bottom left;
    max-width: calc(100% - 12px);
    pointer-events: none;
  }

  .frameTag {
    position: absolute;
    right: 8px;
    bottom: 8px;
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    border: none;
  }

  .scaleControl {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: 13px;
    color: var(--td-text-color-primary, #333);
  }

  .frameInfo {
    margin-top: 6px;
    font-size: 12px;
    color: var(--td-text-color-primary, #333);
    line-height: 1.4;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
:deep(.t-image__wrapper) {
  background-color: transparent !important;
}
.editInfoForm {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 4px 0;
}

.editInfoField {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.editInfoLabel {
  font-size: 13px;
  color: var(--td-text-color-secondary);
}
</style>
