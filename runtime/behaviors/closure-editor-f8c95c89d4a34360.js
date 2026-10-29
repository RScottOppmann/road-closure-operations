export default async function install(app) {
  const mount = app.getMount("closure-editor");
  const Editor = await app.import("esri/widgets/Editor");
  const layer = app.layers[app.config.layerId];
  if (!layer) throw new Error("Closure layer is unavailable.");
  await layer.load();

  const content = document.createElement("div");
  content.style.marginTop = "0.7rem";
  const notice = document.createElement("p");
  notice.textContent = "Create a closure line, select an existing closure to update its location or attributes, or delete it from the editing workflow. Changes are saved to the Road Closures service.";
  notice.style.margin = "0 0 0.75rem";
  notice.style.color = "var(--app-text-muted)";
  const editorHost = document.createElement("div");
  editorHost.style.minWidth = "0";
  content.append(notice, editorHost);
  mount.replaceChildren(content);

  const editor = new Editor({
    view: app.view,
    container: editorHost,
    layerInfos: [{
      layer,
      enabled: true,
      addEnabled: true,
      updateEnabled: true,
      deleteEnabled: true,
      geometryUpdatesEnabled: true,
      attributeUpdatesEnabled: true
    }]
  });
  await editor.when();
  app.onCleanup(() => {
    editor.destroy();
    mount.replaceChildren();
  });
}