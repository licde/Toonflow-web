let setupPromise: Promise<void> | null = null;

export function setupMdEditor(handleLinkClick: (event: MouseEvent) => boolean | Promise<boolean>) {
  if (!setupPromise) {
    setupPromise = (async () => {
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
    })();
  }
  return setupPromise;
}
