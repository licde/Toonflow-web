<template>
  <div class="imageUploadBox ac">
    <!-- 单图模式 -->
    <template v-if="mode == 'singleImage' || Array.isArray(parseMode(mode as string))">
      <div class="uploadBtn c fc" v-for="(item, index) in mode == 'singleImage' ? imageList.slice(0, 1) : imageList" :key="index">
        <template v-if="item.src">
          <t-image v-if="item.fileType == 'image'" :src="item.src" fit="contain" class="uploadPreview">
            <template #overlayContent>
              <div class="imageToolsWrap">
                <ImageTools :src="item.src!" position="br" />
              </div>
            </template>
          </t-image>
          <t-tooltip theme="primary" v-else-if="item.fileType == 'audio'" :content="item?.prompt || ''">
            <div class="mediaPreview audioPreview">
              <i-acoustic size="20" />
              <span class="mediaLabel">音频</span>
            </div>
          </t-tooltip>
          <div v-else-if="item.fileType == 'video'" class="mediaPreview videoPreview">
            <video class="uploadPreview" :src="item.src" preload="metadata" muted />
          </div>
        </template>
        <template v-else>
          <t-tooltip theme="primary" :content="item?.prompt ? '音频内容：' + item.prompt : ''">
            <span style="font-size: 20px">文</span>
          </t-tooltip>
        </template>
        <div class="imageTitleWrap" v-if="item.sources == 'storyboard' && item.index != null">
          {{ `P${item.index + 1}` }}
        </div>
        <t-tag v-if="isWeakStill(item)" size="small" theme="warning" variant="light" class="slotWeakTag">
          {{ stillBadge(item) }}
        </t-tag>
        <div class="clearBtn" @click="splitImage(index)">
          <i-close size="12" />
        </div>
        <div class="source">
          <t-tag size="small">
            {{ item.sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}
          </t-tag>
        </div>
      </div>
    </template>
    <template v-else-if="mode == 'endFrameOptional' || mode == 'startFrameOptional' || mode == 'startEndRequired'">
      <div class="uploadBtn c fc" v-for="(item, index) in buildLabel" :key="item.value" @click="handleMixedAdd(item.value as 'start' | 'end')">
        <div v-if="!isEmptySlot(imageList?.[index])" style="flex: 1; width: 100%" class="ac">
          <template v-if="imageList?.[index]?.src">
            <t-image v-if="imageList?.[index]?.fileType == 'image'" :src="imageList?.[index]!.src" fit="contain" class="uploadPreview">
              <template #overlayContent>
                <div class="imageToolsWrap">
                  <ImageTools :src="imageList?.[index]!.src" position="br" />
                </div>
              </template>
            </t-image>
            <div v-else-if="imageList?.[index]?.fileType == 'audio'" class="mediaPreview audioPreview">
              <i-acoustic size="20" />
              <span class="mediaLabel">音频</span>
            </div>
            <div v-else-if="imageList?.[index]?.fileType == 'video'" class="mediaPreview videoPreview">
              <video class="uploadPreview" :src="imageList?.[index]!.src" preload="metadata" muted />
            </div>
          </template>
          <template v-else>
            <t-tooltip theme="primary" :content="imageList?.[index]?.prompt || ''">
              <span style="font-size: 20px">文</span>
            </t-tooltip>
          </template>
          <div class="imageTitleWrap" v-if="imageList?.[index]?.sources == 'storyboard' && imageList?.[index]?.index != null">
            {{ `P${imageList[index]?.index + 1}` }}
          </div>
          <t-tag
            v-if="imageList?.[index] && isWeakStill(imageList[index]!)"
            size="small"
            theme="warning"
            variant="light"
            class="slotWeakTag"
          >
            {{ stillBadge(imageList[index]!) }}
          </t-tag>
          <div class="clearBtn" @click.stop="clearImage(index)">
            <i-close size="12" />
          </div>
          <div class="source">
            <t-tag size="small">
              {{ imageList?.[index]?.sources == "storyboard" ? $t("workbench.generate.storyboard") : $t("workbench.generate.assets") }}
            </t-tag>
          </div>
        </div>
        <template v-else>
          <i-plus size="24"></i-plus>
          {{ item.label }}
        </template>
      </div>
    </template>
    <div class="uploadBtn c fc" v-if="isShowAddImage" @click="handleMixedAdd()">
      <i-plus size="24"></i-plus>
      {{ $t("workbench.generate.addReference") }}
    </div>

    <!-- 分镜选择弹窗 -->
    <t-dialog
      v-model:visible="storyboardDialogVisible"
      :header="$t('workbench.generate.selectStoryboard')"
      :footer="false"
      width="800px"
      placement="center">
      <div class="storyboardGrid">
        <div class="storyboardItem" v-for="sb in displayStoryboardList" :key="sb.id" @click="pickStoryboard(sb)">
          <div class="imageTitleWrap" v-if="sb?.index != null">
            {{ `P${sb?.index + 1}` }}
          </div>
          <img v-if="sb.src" :src="sb.src" />
          <div v-else class="textBox ac jc">
            <t-tooltip theme="primary" :content="sb?.videoDesc || ''">
              <span style="font-size: 20px">{{ `分镜 ${sb?.index + 1 || ""}` }}</span>
            </t-tooltip>
          </div>
          <t-tag
            v-if="isWeakStill(sb)"
            size="small"
            theme="warning"
            variant="light"
            class="weakStillTag"
          >
            {{ stillBadge(sb) }}
          </t-tag>
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import "@/views/production/components/workbench/type/type";
import assetsCheck, { type AssetType, type ClipMediaType } from "@/utils/assetsCheck";
import axios from "@/utils/axios";
import imageListCacheStore from "@/stores/imageListCache";
import { stillQualityBadgeLabel, type StillMeta } from "@/types/stillQuality";

function isWeakStill(sb: {
  stateHint?: string;
  stillQuality?: string;
  visualPass?: boolean;
  sheetLeak?: boolean;
}): boolean {
  return sb.stateHint === "weak_keep" || sb.stillQuality === "weak" || sb.visualPass === false || sb.sheetLeak === true;
}

function stillBadge(sb: {
  stillQuality?: StillMeta["stillQuality"];
  visualPass?: boolean;
  sheetLeak?: boolean;
}): string {
  return stillQualityBadgeLabel({
    stillQuality: sb.stillQuality,
    visualPass: sb.visualPass,
    sheetLeak: sb.sheetLeak,
  } as StillMeta);
}

const props = defineProps<{
  mode: VideoMode;
  storyboardList: StoryboardItem[];
}>();
const imageList = defineModel<UploadItem[]>({
  default: () => [],
});
const cacheStore = imageListCacheStore();
const { urlMap } = storeToRefs(cacheStore);
const { resolveUrls: resolveUrlsFn, resolveUrlSync: resolveUrlSyncFn } = cacheStore;

const displayStoryboardList = computed(() => {
  // Depend on urlMap for reactivity after warm-up
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  urlMap.value;
  return props.storyboardList.map((sb) => ({
    ...sb,
    src: resolveUrlSyncFn(sb.id, "storyboard", sb.src) || sb.src,
  }));
});
//分镜选择弹窗
const storyboardDialogVisible = ref(false);

async function openStoryboardDialog() {
  const items = props.storyboardList.filter((s) => s.id != null).map((s) => ({ id: s.id, sources: "storyboard" as const }));
  if (items.length) await resolveUrlsFn(items);
  storyboardDialogVisible.value = true;
}

/** 空占位项，用于首尾帧模式中未设置的槽位 */
const EMPTY_SLOT: UploadItem = { fileType: "image", id: null, src: "" } as any;
function isEmptySlot(item: UploadItem | undefined): boolean {
  return !item || !item.id;
}

const buildLabel = computed(() => {
  const startOptional = props.mode === "startFrameOptional";
  const endOptional = props.mode === "endFrameOptional";
  return [
    { label: startOptional ? "首帧(可选)" : "首帧", value: "start" },
    { label: endOptional ? "尾帧(可选)" : "尾帧", value: "end" },
  ];
});

/** 确保 imageList 始终有两个槽位（首帧 index=0，尾帧 index=1） */
function ensureFrameSlots(): UploadItem[] {
  const list = [...imageList.value];
  while (list.length < 2) list.push({ ...EMPTY_SLOT });
  return list;
}

/** 将 item 设置到首帧或尾帧槽位 */
function setFrameSlot(slot: "start" | "end", item: UploadItem) {
  const list = ensureFrameSlots();
  list[slot === "start" ? 0 : 1] = item;
  imageList.value = list;
}

/** 解析模式值（字符串或 JSON 数组） */
function parseMode(value: string): VideoMode | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed as ReferenceType[];
  } catch {
    return value as Exclude<VideoMode, ReferenceType[]>;
  }
  return value as Exclude<VideoMode, ReferenceType[]>;
}

//判断是否显示添加参考图
const isShowAddImage = computed(() => {
  const mode = props.mode;
  if (mode == "singleImage" && imageList.value.length >= 1) {
    return false;
  }
  if (mode == "endFrameOptional" || mode == "startEndRequired" || mode == "startFrameOptional") {
    return false;
  }
  if (mode == "text") return false;
  //多参模式默认 true
  return true;
});

/** 根据文件扩展名推断媒体类型 */
function getFileTypeByExt(src: string | undefined): "image" | "video" | "audio" {
  const ext = src?.split(".").pop()?.toLowerCase() ?? "";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) return "audio";
  return "image";
}
/** 根据混合模式推导当前允许的 clip 媒体类型（mode 可能是 JSON 字符串） */
const mixedClipMediaTypes = computed<ClipMediaType[]>(() => {
  const parsed = parseMode(props.mode as string);
  const modeArr = Array.isArray(parsed) ? parsed : Array.isArray(props.mode) ? (props.mode as ReferenceType[]) : [];
  if (!modeArr.length) return [];
  const map: Record<string, ClipMediaType> = { audioReference: "audio", imageReference: "image", videoReference: "video" };
  return modeArr
    .map((m) => String(m).split(":")[0])
    .filter((m) => m in map)
    .map((m) => map[m]);
});
let currentSlot: "start" | "end" | "" = "";
function handleMixedAdd(slot: "start" | "end" | "" = "") {
  if (!props.mode) return window.$message.error($t("workbench.generate.notSelectMode"));
  currentSlot = slot;
  const multiple = Array.isArray(parseMode(props.mode as string));
  const dlg = DialogPlugin.confirm({
    header: $t("workbench.generate.selectSource"),
    confirmBtn: $t("workbench.generate.confirm"),
    cancelBtn: $t("workbench.generate.cancel"),
    onConfirm: async () => {
      dlg.destroy();
      const assets = await assetsCheck({ types: ["role", "tool", "scene", "clip", "audio"], clipMediaTypes: mixedClipMediaTypes.value, multiple });

      if (!assets.length) return;

      const newItems: UploadItem[] = assets.flatMap((asset) => {
        if (asset.type === "audio" && asset?.sonAssets?.length) {
          return asset.sonAssets.map((sub: any) => {
            const fileType = getFileTypeByExt(sub.src);
            return {
              fileType,
              sources: "assets",
              src: sub.src,
              id: sub.id,
              prompt: sub.prompt,
            } as UploadItem;
          });
        }
        const fileType = getFileTypeByExt(asset.src);
        return [
          {
            fileType,
            sources: "assets",
            src: asset.src,
            id: asset.id,
            prompt: asset.prompt,
          } as UploadItem,
        ];
      });
      if (slot === "start" || slot === "end") {
        setFrameSlot(slot, newItems[0]);
      } else if (props.mode === "singleImage") {
        imageList.value = [newItems[0]];
      } else {
        const assetsNotAudioIds = newItems.filter((i) => i.fileType !== "audio");
        const { data } = await axios.post("/production/workbench/getAudioBindAssetsList", {
          assetsIds: assetsNotAudioIds.map((i) => i.id),
        });
        imageList.value = [...imageList.value, ...newItems, ...(data ?? [])];
      }
    },
    onCancel: () => {
      dlg.destroy();
      void openStoryboardDialog();
    },
  });
}
function clearImage(index: number) {
  const list = ensureFrameSlots();
  list[index] = { ...EMPTY_SLOT };
  imageList.value = list;
}
/** 分镜弹窗选中回调 — weak stills selectable but toast (BE burn still gates) */
function pickStoryboard(sb: StoryboardItem) {
  storyboardDialogVisible.value = false;
  const fileType = "image";
  const resolved = resolveUrlSyncFn(sb.id, "storyboard", sb.src);
  const newItem = {
    fileType,
    sources: "storyboard",
    src: resolved || sb.src,
    id: sb.id,
    prompt: sb.videoDesc ?? undefined,
    index: sb.index,
    stillQuality: sb.stillQuality,
    visualPass: sb.visualPass,
    stateHint: sb.stateHint,
    sheetLeak: sb.sheetLeak,
    userMessage: sb.userMessage,
    ctaLabel: sb.ctaLabel,
  } as UploadItem;

  if (isWeakStill(sb)) {
    window.$message?.warning?.(
      String(sb.userMessage || sb.ctaLabel || "该分镜为弱图/未验收，不可作高质量视频首帧"),
    );
  }

  if (currentSlot === "start" || currentSlot === "end") {
    setFrameSlot(currentSlot, newItem);
  } else {
    imageList.value = [...imageList.value, newItem];
  }
}
function splitImage(index: number) {
  const list = [...imageList.value];
  list.splice(index, 1);
  imageList.value = list;
}
</script>

<style lang="scss" scoped>
.imageUploadBox {
  gap: 8px;
  overflow-x: auto;
  flex-wrap: nowrap;
  padding-bottom: 6px;
  &::-webkit-scrollbar {
    height: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: #696969;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background-color: var(--td-bg-color-secondarycontainer);
    border-radius: 4px;
  }
  .imageTitleWrap {
    z-index: 999;
    position: absolute;
    left: 4px;
    top: 4px;
    padding: 0 5px;
    font-size: 11px;
    line-height: 18px;
    background: rgba(0, 0, 0, 0.55);
    color: #fff;
    border-radius: 4px;
    backdrop-filter: blur(4px);
    user-select: none;
    white-space: nowrap;
  }
  .uploadBtn {
    width: 80px;
    min-width: 80px;
    height: 80px;
    flex-shrink: 0;
    position: relative;
    border: 1px dashed var(--td-component-border);
    border-radius: 8px;
    &:hover {
      border-color: var(--td-text-color);
      cursor: pointer;
    }
    .slotWeakTag {
      position: absolute;
      left: 4px;
      bottom: 4px;
      z-index: 4;
      max-width: calc(100% - 8px);
      pointer-events: none;
      font-size: 10px;
    }

    .uploadPreview {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 8px;
      position: relative;
      .imageToolsWrap {
        height: 100%;
        transform: scale(0.6);
        transform-origin: bottom right;
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
    .mediaPreview {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      border-radius: 8px;
      gap: 4px;
      .mediaLabel {
        font-size: 11px;
        color: var(--td-text-color-secondary);
      }
      &.audioPreview {
        background: var(--td-bg-color-secondarycontainer);
        color: var(--td-brand-color);
      }
      &.videoPreview {
        background: #000;
        overflow: hidden;
      }
    }
    .clearBtn {
      z-index: 999999999999999;
      position: absolute;
      top: 2px;
      right: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      &:hover {
        background: rgba(0, 0, 0, 0.85);
      }
    }
    &:hover .clearBtn {
      display: flex;
    }
    .source {
      position: absolute;
      bottom: 2px;
      right: 2px;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      display: none;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      &:hover {
        background: rgba(0, 0, 0, 0.85);
      }
    }
    &:hover .source {
      display: flex;
    }
  }
  .storyboardGrid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    max-height: 60vh;
    overflow-y: auto;
    padding: 4px;
    .storyboardItem {
      cursor: pointer;
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      border: 2px solid transparent;
      transition:
        border-color 0.2s,
        box-shadow 0.2s;
      &:hover {
        border-color: var(--td-brand-color);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
      }
      img {
        width: 100%;
        aspect-ratio: 16/9;
        object-fit: cover;
        display: block;
      }
      .textBox {
        aspect-ratio: 16/9;
        width: 100%;
        text-align: center;
        border: 1px solid #ccc;
      }
      .weakStillTag {
        position: absolute;
        left: 6px;
        bottom: 6px;
        z-index: 2;
        max-width: calc(100% - 12px);
        pointer-events: none;
      }
    }
  }
}
</style>
