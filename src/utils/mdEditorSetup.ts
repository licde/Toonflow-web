/** md-editor 全局配置与样式，按需加载以降低首屏体积 */

let initialized = false;

export async function setupMdEditor(handleLinkClick: (event: MouseEvent) => boolean | void | Promise<boolean | void>) {
  if (initialized) return;
  initialized = true;

  await import("md-editor-v3/lib/style.css");
  const { config } = await import("md-editor-v3");

  (window as Window & { handleLinkClick?: typeof handleLinkClick }).handleLinkClick = handleLinkClick;

  config({
    markdownItConfig(md) {
      const defaultRender =
        md.renderer.rules.link_open ||
        function (tokens, idx, options, env, self) {
          return self.renderToken(tokens, idx, options);
        };
      md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const href = token.attrGet("href");

        if (href) {
          token.attrSet("target", "_blank");
          token.attrSet("rel", "noopener noreferrer");
          token.attrSet("data-link", href);
          token.attrSet("onclick", "return handleLinkClick(event)");
        }

        return defaultRender(tokens, idx, options, env, self);
      };
    },
  });
}
