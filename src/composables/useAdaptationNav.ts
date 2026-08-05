import { useRouter } from "vue-router";
import productionAgentStore from "@/stores/productionAgent";
import projectStore from "@/stores/project";

const OPEN_SCRIPT_IMPORT_KEY = "tf:production:openImport";

/** Map reverseTarget layer → scriptAgent stage / tab */
const STAGE_TAB: Record<string, number> = {
  P03: 1,
  CD: 1,
  BP: 1,
  W1: 1,
  W2: 1,
  W3: 1,
  GB: 1,
  B: 1,
  SB: 2,
  EN: 2,
  MD: 2,
  AS: 2,
  INFRA: 2,
};

function requireProjectOrRedirect(router: ReturnType<typeof useRouter>): boolean {
  if (projectStore().project?.id) return true;
  window.$message?.warning?.(window.$t?.("workbench.selectProject") ?? "请选择项目");
  router.push("/project");
  return false;
}

export function useAdaptationNav() {
  const router = useRouter();

  function goAdaptation() {
    if (!requireProjectOrRedirect(router)) return;
    router.push({ path: "/scriptAgent", query: { mode: "adapt" } });
  }

  function goOriginal() {
    if (!requireProjectOrRedirect(router)) return;
    router.push({ path: "/scriptAgent", query: { mode: "original" } });
  }

  /** Jump to design stage for rePush plan item */
  function goDesignStage(reverseTarget: string, trigger?: string) {
    if (!requireProjectOrRedirect(router)) return;
    const stage = reverseTarget?.toUpperCase?.() ?? reverseTarget;
    router.push({
      path: "/scriptAgent",
      query: {
        mode: "adapt",
        stage,
        ...(trigger ? { trigger } : {}),
      },
    });
  }

  function goExternalRevision() {
    if (!requireProjectOrRedirect(router)) return;
    sessionStorage.setItem(OPEN_SCRIPT_IMPORT_KEY, "script");
    router.push("/production");
  }

  function goProduction(scriptId?: number) {
    if (!requireProjectOrRedirect(router)) return;
    if (scriptId) {
      productionAgentStore().episodesId = scriptId;
    }
    router.push({
      path: "/production",
      query: scriptId ? { scriptId: String(scriptId) } : undefined,
    });
  }

  return { goAdaptation, goOriginal, goExternalRevision, goProduction, goDesignStage, STAGE_TAB, OPEN_SCRIPT_IMPORT_KEY };
}
