/** 极速构建占位：跳过 monaco-editor 全量打包 */
const noop = () => undefined;

export const editor = {
  create: noop,
  createModel: noop,
  setModelLanguage: noop,
  defineTheme: noop,
  setTheme: noop,
};

export default editor;
