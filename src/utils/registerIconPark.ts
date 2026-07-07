import type { App, Component } from "vue";
import Acoustic from "@icon-park/vue-next/es/icons/Acoustic";
import Api from "@icon-park/vue-next/es/icons/Api";
import ApplicationMenu from "@icon-park/vue-next/es/icons/ApplicationMenu";
import Attention from "@icon-park/vue-next/es/icons/Attention";
import AudioFile from "@icon-park/vue-next/es/icons/AudioFile";
import Bill from "@icon-park/vue-next/es/icons/Bill";
import Blackboard from "@icon-park/vue-next/es/icons/Blackboard";
import BranchOne from "@icon-park/vue-next/es/icons/BranchOne";
import CarouselVideo from "@icon-park/vue-next/es/icons/CarouselVideo";
import Check from "@icon-park/vue-next/es/icons/Check";
import CheckOne from "@icon-park/vue-next/es/icons/CheckOne";
import Clear from "@icon-park/vue-next/es/icons/Clear";
import ClickToFold from "@icon-park/vue-next/es/icons/ClickToFold";
import Close from "@icon-park/vue-next/es/icons/Close";
import CloseSmall from "@icon-park/vue-next/es/icons/CloseSmall";
import Code from "@icon-park/vue-next/es/icons/Code";
import ColorFilter from "@icon-park/vue-next/es/icons/ColorFilter";
import Computer from "@icon-park/vue-next/es/icons/Computer";
import Copy from "@icon-park/vue-next/es/icons/Copy";
import CuttingOne from "@icon-park/vue-next/es/icons/CuttingOne";
import Data from "@icon-park/vue-next/es/icons/Data";
import Delete from "@icon-park/vue-next/es/icons/Delete";
import DeleteOne from "@icon-park/vue-next/es/icons/DeleteOne";
import DocumentFolder from "@icon-park/vue-next/es/icons/DocumentFolder";
import Dot from "@icon-park/vue-next/es/icons/Dot";
import Down from "@icon-park/vue-next/es/icons/Down";
import Download from "@icon-park/vue-next/es/icons/Download";
import Editing from "@icon-park/vue-next/es/icons/Editing";
import Edit from "@icon-park/vue-next/es/icons/Edit";
import ExpandTextInput from "@icon-park/vue-next/es/icons/ExpandTextInput";
import Export from "@icon-park/vue-next/es/icons/Export";
import FileText from "@icon-park/vue-next/es/icons/FileText";
import Film from "@icon-park/vue-next/es/icons/Film";
import Flask from "@icon-park/vue-next/es/icons/Flask";
import FolderClose from "@icon-park/vue-next/es/icons/FolderClose";
import FolderOpen from "@icon-park/vue-next/es/icons/FolderOpen";
import FullScreenOne from "@icon-park/vue-next/es/icons/FullScreenOne";
import Github from "@icon-park/vue-next/es/icons/Github";
import GithubOne from "@icon-park/vue-next/es/icons/GithubOne";
import GoEnd from "@icon-park/vue-next/es/icons/GoEnd";
import GoStart from "@icon-park/vue-next/es/icons/GoStart";
import GoodTwo from "@icon-park/vue-next/es/icons/GoodTwo";
import HardDisk from "@icon-park/vue-next/es/icons/HardDisk";
import Info from "@icon-park/vue-next/es/icons/Info";
import Landscape from "@icon-park/vue-next/es/icons/Landscape";
import Lightning from "@icon-park/vue-next/es/icons/Lightning";
import LoadingFour from "@icon-park/vue-next/es/icons/LoadingFour";
import Lock from "@icon-park/vue-next/es/icons/Lock";
import Logout from "@icon-park/vue-next/es/icons/Logout";
import Magic from "@icon-park/vue-next/es/icons/Magic";
import MemoryCardOne from "@icon-park/vue-next/es/icons/MemoryCardOne";
import MenuUnfoldOne from "@icon-park/vue-next/es/icons/MenuUnfoldOne";
import Notebook from "@icon-park/vue-next/es/icons/Notebook";
import Pause from "@icon-park/vue-next/es/icons/Pause";
import PeoplesTwo from "@icon-park/vue-next/es/icons/PeoplesTwo";
import Pencil from "@icon-park/vue-next/es/icons/Pencil";
import Permissions from "@icon-park/vue-next/es/icons/Permissions";
import Pic from "@icon-park/vue-next/es/icons/Pic";
import Picture from "@icon-park/vue-next/es/icons/Picture";
import Play from "@icon-park/vue-next/es/icons/Play";
import PlaybackProgress from "@icon-park/vue-next/es/icons/PlaybackProgress";
import Plus from "@icon-park/vue-next/es/icons/Plus";
import PreviewOpen from "@icon-park/vue-next/es/icons/PreviewOpen";
import Receive from "@icon-park/vue-next/es/icons/Receive";
import Redo from "@icon-park/vue-next/es/icons/Redo";
import Refresh from "@icon-park/vue-next/es/icons/Refresh";
import ReduceOne from "@icon-park/vue-next/es/icons/ReduceOne";
import Right from "@icon-park/vue-next/es/icons/Right";
import Ring from "@icon-park/vue-next/es/icons/Ring";
import Round from "@icon-park/vue-next/es/icons/Round";
import Save from "@icon-park/vue-next/es/icons/Save";
import Search from "@icon-park/vue-next/es/icons/Search";
import Send from "@icon-park/vue-next/es/icons/Send";
import SettingConfig from "@icon-park/vue-next/es/icons/SettingConfig";
import SettingOne from "@icon-park/vue-next/es/icons/SettingOne";
import SettingTwo from "@icon-park/vue-next/es/icons/SettingTwo";
import Share from "@icon-park/vue-next/es/icons/Share";
import Theme from "@icon-park/vue-next/es/icons/Theme";
import ThinkingProblem from "@icon-park/vue-next/es/icons/ThinkingProblem";
import Tips from "@icon-park/vue-next/es/icons/Tips";
import ToBottom from "@icon-park/vue-next/es/icons/ToBottom";
import Tool from "@icon-park/vue-next/es/icons/Tool";
import Translate from "@icon-park/vue-next/es/icons/Translate";
import TreeDiagram from "@icon-park/vue-next/es/icons/TreeDiagram";
import Undo from "@icon-park/vue-next/es/icons/Undo";
import Upload from "@icon-park/vue-next/es/icons/Upload";
import UploadOne from "@icon-park/vue-next/es/icons/UploadOne";
import Video from "@icon-park/vue-next/es/icons/Video";
import ViewList from "@icon-park/vue-next/es/icons/ViewList";
import VolumeMute from "@icon-park/vue-next/es/icons/VolumeMute";
import VolumeNotice from "@icon-park/vue-next/es/icons/VolumeNotice";
import Time from "@icon-park/vue-next/es/icons/Time";

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
