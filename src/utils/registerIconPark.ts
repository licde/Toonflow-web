import type { App, Component } from "vue";
import "@icon-park/vue-next/styles/index.css";
import Acoustic from "@icon-park/vue-next/lib/icons/Acoustic";
import Api from "@icon-park/vue-next/lib/icons/Api";
import ApplicationMenu from "@icon-park/vue-next/lib/icons/ApplicationMenu";
import Attention from "@icon-park/vue-next/lib/icons/Attention";
import AudioFile from "@icon-park/vue-next/lib/icons/AudioFile";
import Bill from "@icon-park/vue-next/lib/icons/Bill";
import Blackboard from "@icon-park/vue-next/lib/icons/Blackboard";
import BranchOne from "@icon-park/vue-next/lib/icons/BranchOne";
import CarouselVideo from "@icon-park/vue-next/lib/icons/CarouselVideo";
import Check from "@icon-park/vue-next/lib/icons/Check";
import CheckOne from "@icon-park/vue-next/lib/icons/CheckOne";
import Clear from "@icon-park/vue-next/lib/icons/Clear";
import ClickToFold from "@icon-park/vue-next/lib/icons/ClickToFold";
import Close from "@icon-park/vue-next/lib/icons/Close";
import CloseSmall from "@icon-park/vue-next/lib/icons/CloseSmall";
import Code from "@icon-park/vue-next/lib/icons/Code";
import ColorFilter from "@icon-park/vue-next/lib/icons/ColorFilter";
import Computer from "@icon-park/vue-next/lib/icons/Computer";
import Copy from "@icon-park/vue-next/lib/icons/Copy";
import CuttingOne from "@icon-park/vue-next/lib/icons/CuttingOne";
import Data from "@icon-park/vue-next/lib/icons/Data";
import Delete from "@icon-park/vue-next/lib/icons/Delete";
import DeleteOne from "@icon-park/vue-next/lib/icons/DeleteOne";
import DocumentFolder from "@icon-park/vue-next/lib/icons/DocumentFolder";
import Dot from "@icon-park/vue-next/lib/icons/Dot";
import Down from "@icon-park/vue-next/lib/icons/Down";
import Download from "@icon-park/vue-next/lib/icons/Download";
import Editing from "@icon-park/vue-next/lib/icons/Editing";
import Edit from "@icon-park/vue-next/lib/icons/Edit";
import ExpandTextInput from "@icon-park/vue-next/lib/icons/ExpandTextInput";
import Export from "@icon-park/vue-next/lib/icons/Export";
import FileText from "@icon-park/vue-next/lib/icons/FileText";
import Film from "@icon-park/vue-next/lib/icons/Film";
import Flask from "@icon-park/vue-next/lib/icons/Flask";
import FolderClose from "@icon-park/vue-next/lib/icons/FolderClose";
import FolderOpen from "@icon-park/vue-next/lib/icons/FolderOpen";
import FullScreenOne from "@icon-park/vue-next/lib/icons/FullScreenOne";
import Github from "@icon-park/vue-next/lib/icons/Github";
import GithubOne from "@icon-park/vue-next/lib/icons/GithubOne";
import GoEnd from "@icon-park/vue-next/lib/icons/GoEnd";
import GoStart from "@icon-park/vue-next/lib/icons/GoStart";
import GoodTwo from "@icon-park/vue-next/lib/icons/GoodTwo";
import HardDisk from "@icon-park/vue-next/lib/icons/HardDisk";
import Info from "@icon-park/vue-next/lib/icons/Info";
import Landscape from "@icon-park/vue-next/lib/icons/Landscape";
import Lightning from "@icon-park/vue-next/lib/icons/Lightning";
import LoadingFour from "@icon-park/vue-next/lib/icons/LoadingFour";
import Lock from "@icon-park/vue-next/lib/icons/Lock";
import Logout from "@icon-park/vue-next/lib/icons/Logout";
import Magic from "@icon-park/vue-next/lib/icons/Magic";
import MemoryCardOne from "@icon-park/vue-next/lib/icons/MemoryCardOne";
import MenuUnfoldOne from "@icon-park/vue-next/lib/icons/MenuUnfoldOne";
import Notebook from "@icon-park/vue-next/lib/icons/Notebook";
import Pause from "@icon-park/vue-next/lib/icons/Pause";
import PeoplesTwo from "@icon-park/vue-next/lib/icons/PeoplesTwo";
import Pencil from "@icon-park/vue-next/lib/icons/Pencil";
import Permissions from "@icon-park/vue-next/lib/icons/Permissions";
import Pic from "@icon-park/vue-next/lib/icons/Pic";
import Picture from "@icon-park/vue-next/lib/icons/Picture";
import Play from "@icon-park/vue-next/lib/icons/Play";
import PlaybackProgress from "@icon-park/vue-next/lib/icons/PlaybackProgress";
import Plus from "@icon-park/vue-next/lib/icons/Plus";
import PreviewOpen from "@icon-park/vue-next/lib/icons/PreviewOpen";
import Receive from "@icon-park/vue-next/lib/icons/Receive";
import Redo from "@icon-park/vue-next/lib/icons/Redo";
import Refresh from "@icon-park/vue-next/lib/icons/Refresh";
import ReduceOne from "@icon-park/vue-next/lib/icons/ReduceOne";
import Right from "@icon-park/vue-next/lib/icons/Right";
import Ring from "@icon-park/vue-next/lib/icons/Ring";
import Round from "@icon-park/vue-next/lib/icons/Round";
import Save from "@icon-park/vue-next/lib/icons/Save";
import Search from "@icon-park/vue-next/lib/icons/Search";
import Send from "@icon-park/vue-next/lib/icons/Send";
import SettingConfig from "@icon-park/vue-next/lib/icons/SettingConfig";
import SettingOne from "@icon-park/vue-next/lib/icons/SettingOne";
import SettingTwo from "@icon-park/vue-next/lib/icons/SettingTwo";
import Share from "@icon-park/vue-next/lib/icons/Share";
import Theme from "@icon-park/vue-next/lib/icons/Theme";
import ThinkingProblem from "@icon-park/vue-next/lib/icons/ThinkingProblem";
import Tips from "@icon-park/vue-next/lib/icons/Tips";
import ToBottom from "@icon-park/vue-next/lib/icons/ToBottom";
import Tool from "@icon-park/vue-next/lib/icons/Tool";
import Translate from "@icon-park/vue-next/lib/icons/Translate";
import TreeDiagram from "@icon-park/vue-next/lib/icons/TreeDiagram";
import Undo from "@icon-park/vue-next/lib/icons/Undo";
import Upload from "@icon-park/vue-next/lib/icons/Upload";
import UploadOne from "@icon-park/vue-next/lib/icons/UploadOne";
import Video from "@icon-park/vue-next/lib/icons/Video";
import ViewList from "@icon-park/vue-next/lib/icons/ViewList";
import VolumeMute from "@icon-park/vue-next/lib/icons/VolumeMute";
import VolumeNotice from "@icon-park/vue-next/lib/icons/VolumeNotice";
import Time from "@icon-park/vue-next/lib/icons/Time";

const ICON_COMPONENTS: Record<string, Component> = {
  acoustic: Acoustic,
  api: Api,
  "application-menu": ApplicationMenu,
  attention: Attention,
  "audio-file": AudioFile,
  bill: Bill,
  blackboard: Blackboard,
  "branch-one": BranchOne,
  "carousel-video": CarouselVideo,
  check: Check,
  "check-one": CheckOne,
  clear: Clear,
  "click-to-fold": ClickToFold,
  close: Close,
  "close-small": CloseSmall,
  code: Code,
  "color-filter": ColorFilter,
  computer: Computer,
  copy: Copy,
  "cutting-one": CuttingOne,
  data: Data,
  delete: Delete,
  "delete-one": DeleteOne,
  "document-folder": DocumentFolder,
  dot: Dot,
  down: Down,
  download: Download,
  editing: Editing,
  edit: Edit,
  "expand-text-input": ExpandTextInput,
  export: Export,
  "file-text": FileText,
  film: Film,
  flask: Flask,
  "folder-close": FolderClose,
  "folder-open": FolderOpen,
  "full-screen-one": FullScreenOne,
  github: Github,
  "github-one": GithubOne,
  "go-end": GoEnd,
  "go-start": GoStart,
  "good-two": GoodTwo,
  "hard-disk": HardDisk,
  info: Info,
  landscape: Landscape,
  lightning: Lightning,
  "loading-four": LoadingFour,
  lock: Lock,
  logout: Logout,
  magic: Magic,
  "memory-card-one": MemoryCardOne,
  "menu-unfold-one": MenuUnfoldOne,
  notebook: Notebook,
  pause: Pause,
  "peoples-two": PeoplesTwo,
  pencil: Pencil,
  permissions: Permissions,
  pic: Pic,
  picture: Picture,
  play: Play,
  "playback-progress": PlaybackProgress,
  plus: Plus,
  "preview-open": PreviewOpen,
  receive: Receive,
  redo: Redo,
  refresh: Refresh,
  "reduce-one": ReduceOne,
  right: Right,
  ring: Ring,
  round: Round,
  save: Save,
  search: Search,
  send: Send,
  "setting-config": SettingConfig,
  "setting-one": SettingOne,
  "setting-two": SettingTwo,
  share: Share,
  theme: Theme,
  "thinking-problem": ThinkingProblem,
  tips: Tips,
  "to-bottom": ToBottom,
  tool: Tool,
  translate: Translate,
  "tree-diagram": TreeDiagram,
  undo: Undo,
  upload: Upload,
  "upload-one": UploadOne,
  video: Video,
  "view-list": ViewList,
  "volume-mute": VolumeMute,
  "volume-notice": VolumeNotice,
  time: Time,
};

export function registerIconPark(app: App) {
  for (const [name, component] of Object.entries(ICON_COMPONENTS)) {
    app.component(`i-${name}`, component);
  }
}
