import type { App, Component } from "vue";
import "@icon-park/vue-next/styles/index.css";

import Acoustic from "@icon-park/vue-next/lib/icons/Acoustic";
import Api from "@icon-park/vue-next/lib/icons/Api";
import ArrowUp from "@icon-park/vue-next/lib/icons/ArrowUp";
import Attention from "@icon-park/vue-next/lib/icons/Attention";
import Bill from "@icon-park/vue-next/lib/icons/Bill";
import Blackboard from "@icon-park/vue-next/lib/icons/Blackboard";
import BranchOne from "@icon-park/vue-next/lib/icons/BranchOne";
import Check from "@icon-park/vue-next/lib/icons/Check";
import CheckOne from "@icon-park/vue-next/lib/icons/CheckOne";
import Clear from "@icon-park/vue-next/lib/icons/Clear";
import ClickToFold from "@icon-park/vue-next/lib/icons/ClickToFold";
import Close from "@icon-park/vue-next/lib/icons/Close";
import CloseOne from "@icon-park/vue-next/lib/icons/CloseOne";
import CloseSmall from "@icon-park/vue-next/lib/icons/CloseSmall";
import Code from "@icon-park/vue-next/lib/icons/Code";
import Copy from "@icon-park/vue-next/lib/icons/Copy";
import CuttingOne from "@icon-park/vue-next/lib/icons/CuttingOne";
import Data from "@icon-park/vue-next/lib/icons/Data";
import Delete from "@icon-park/vue-next/lib/icons/Delete";
import DeleteOne from "@icon-park/vue-next/lib/icons/DeleteOne";
import DocumentFolder from "@icon-park/vue-next/lib/icons/DocumentFolder";
import Dot from "@icon-park/vue-next/lib/icons/Dot";
import Down from "@icon-park/vue-next/lib/icons/Down";
import Download from "@icon-park/vue-next/lib/icons/Download";
import Edit from "@icon-park/vue-next/lib/icons/Edit";
import Editing from "@icon-park/vue-next/lib/icons/Editing";
import Editor from "@icon-park/vue-next/lib/icons/Editor";
import Exchange from "@icon-park/vue-next/lib/icons/Exchange";
import ExpandTextInput from "@icon-park/vue-next/lib/icons/ExpandTextInput";
import Export from "@icon-park/vue-next/lib/icons/Export";
import FileText from "@icon-park/vue-next/lib/icons/FileText";
import Film from "@icon-park/vue-next/lib/icons/Film";
import FlashPayment from "@icon-park/vue-next/lib/icons/FlashPayment";
import FolderOpen from "@icon-park/vue-next/lib/icons/FolderOpen";
import FullScreenOne from "@icon-park/vue-next/lib/icons/FullScreenOne";
import Github from "@icon-park/vue-next/lib/icons/Github";
import GithubOne from "@icon-park/vue-next/lib/icons/GithubOne";
import GoEnd from "@icon-park/vue-next/lib/icons/GoEnd";
import GoStart from "@icon-park/vue-next/lib/icons/GoStart";
import GoodTwo from "@icon-park/vue-next/lib/icons/GoodTwo";
import Inbox from "@icon-park/vue-next/lib/icons/Inbox";
import Lightning from "@icon-park/vue-next/lib/icons/Lightning";
import LoadingFour from "@icon-park/vue-next/lib/icons/LoadingFour";
import Magic from "@icon-park/vue-next/lib/icons/Magic";
import MenuUnfoldOne from "@icon-park/vue-next/lib/icons/MenuUnfoldOne";
import Music from "@icon-park/vue-next/lib/icons/Music";
import MusicOne from "@icon-park/vue-next/lib/icons/MusicOne";
import Notes from "@icon-park/vue-next/lib/icons/Notes";
import Pencil from "@icon-park/vue-next/lib/icons/Pencil";
import Pic from "@icon-park/vue-next/lib/icons/Pic";
import Picture from "@icon-park/vue-next/lib/icons/Picture";
import Play from "@icon-park/vue-next/lib/icons/Play";
import PlaybackProgress from "@icon-park/vue-next/lib/icons/PlaybackProgress";
import Plus from "@icon-park/vue-next/lib/icons/Plus";
import PreviewOpen from "@icon-park/vue-next/lib/icons/PreviewOpen";
import Redo from "@icon-park/vue-next/lib/icons/Redo";
import ReduceOne from "@icon-park/vue-next/lib/icons/ReduceOne";
import Refresh from "@icon-park/vue-next/lib/icons/Refresh";
import Right from "@icon-park/vue-next/lib/icons/Right";
import Round from "@icon-park/vue-next/lib/icons/Round";
import Save from "@icon-park/vue-next/lib/icons/Save";
import Search from "@icon-park/vue-next/lib/icons/Search";
import Send from "@icon-park/vue-next/lib/icons/Send";
import SettingConfig from "@icon-park/vue-next/lib/icons/SettingConfig";
import SettingOne from "@icon-park/vue-next/lib/icons/SettingOne";
import SettingTwo from "@icon-park/vue-next/lib/icons/SettingTwo";
import Share from "@icon-park/vue-next/lib/icons/Share";
import ThinkingProblem from "@icon-park/vue-next/lib/icons/ThinkingProblem";
import Time from "@icon-park/vue-next/lib/icons/Time";
import Tips from "@icon-park/vue-next/lib/icons/Tips";
import ToBottom from "@icon-park/vue-next/lib/icons/ToBottom";
import Translate from "@icon-park/vue-next/lib/icons/Translate";
import TreeDiagram from "@icon-park/vue-next/lib/icons/TreeDiagram";
import Undo from "@icon-park/vue-next/lib/icons/Undo";
import Upload from "@icon-park/vue-next/lib/icons/Upload";
import UploadOne from "@icon-park/vue-next/lib/icons/UploadOne";
import Video from "@icon-park/vue-next/lib/icons/Video";
import VideoOne from "@icon-park/vue-next/lib/icons/VideoOne";
import VolumeMute from "@icon-park/vue-next/lib/icons/VolumeMute";
import VolumeNotice from "@icon-park/vue-next/lib/icons/VolumeNotice";

const iconComponents: Record<string, Component> = {
  "i-acoustic": Acoustic,
  "i-api": Api,
  "i-arrow-up": ArrowUp,
  "i-attention": Attention,
  "i-bill": Bill,
  "i-blackboard": Blackboard,
  "i-branch-one": BranchOne,
  "i-check": Check,
  "i-check-one": CheckOne,
  "i-clear": Clear,
  "i-click-to-fold": ClickToFold,
  "i-close": Close,
  "i-close-one": CloseOne,
  "i-close-small": CloseSmall,
  "i-code": Code,
  "i-copy": Copy,
  "i-cutting-one": CuttingOne,
  "i-data": Data,
  "i-delete": Delete,
  "i-delete-one": DeleteOne,
  "i-document-folder": DocumentFolder,
  "i-dot": Dot,
  "i-down": Down,
  "i-download": Download,
  "i-edit": Edit,
  "i-editing": Editing,
  "i-editor": Editor,
  "i-exchange": Exchange,
  "i-expand-text-input": ExpandTextInput,
  "i-export": Export,
  "i-file-text": FileText,
  "i-film": Film,
  "i-flash-payment": FlashPayment,
  "i-folder-open": FolderOpen,
  "i-full-screen-one": FullScreenOne,
  "i-github": Github,
  "i-github-one": GithubOne,
  "i-go-end": GoEnd,
  "i-go-start": GoStart,
  "i-good-two": GoodTwo,
  "i-inbox": Inbox,
  "i-lightning": Lightning,
  "i-loading-four": LoadingFour,
  "i-magic": Magic,
  "i-menu-unfold-one": MenuUnfoldOne,
  "i-music": Music,
  "i-music-one": MusicOne,
  "i-notes": Notes,
  "i-pencil": Pencil,
  "i-pic": Pic,
  "i-picture": Picture,
  "i-play": Play,
  "i-playback-progress": PlaybackProgress,
  "i-plus": Plus,
  "i-preview-open": PreviewOpen,
  "i-redo": Redo,
  "i-reduce-one": ReduceOne,
  "i-refresh": Refresh,
  "i-right": Right,
  "i-round": Round,
  "i-save": Save,
  "i-search": Search,
  "i-send": Send,
  "i-setting-config": SettingConfig,
  "i-setting-one": SettingOne,
  "i-setting-two": SettingTwo,
  "i-share": Share,
  "i-thinking-problem": ThinkingProblem,
  "i-time": Time,
  "i-tips": Tips,
  "i-to-bottom": ToBottom,
  "i-translate": Translate,
  "i-tree-diagram": TreeDiagram,
  "i-undo": Undo,
  "i-upload": Upload,
  "i-upload-one": UploadOne,
  "i-video": Video,
  "i-video-one": VideoOne,
  "i-volume-mute": VolumeMute,
  "i-volume-notice": VolumeNotice,
};

export function registerIconPark(app: App) {
  for (const [name, component] of Object.entries(iconComponents)) {
    app.component(name, component);
  }
}
