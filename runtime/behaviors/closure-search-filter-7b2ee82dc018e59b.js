export default async function install(app) {
  const root = app.getMount("closure-search-filter");
  const FeatureFilter = await app.import("esri/layers/support/FeatureFilter");
  const layer = app.layers[app.config.layerId];
  if (!layer) throw new Error("Closure layer is unavailable.");
  await layer.load();
  const layerView = await app.view.whenLayerView(layer);
  const container = document.createElement("div");
  Object.assign(container.style, { display:"grid", gap:"0.65rem", minWidth:"0", marginTop:"0.7rem" });
  const help = document.createElement("p");
  help.textContent = "Enter a road name and press Enter to search the map.";
  Object.assign(help.style, { margin:"0", color:"var(--app-text-muted)" });
  const input = document.createElement("calcite-input-text");
  input.setAttribute("placeholder", "Example: Main Street");
  input.setAttribute("label", "Road name");
  input.setAttribute("clearable", "");
  const clear = document.createElement("calcite-button");
  clear.textContent = "Clear search";
  clear.setAttribute("appearance", "outline");
  const message = document.createElement("p");
  Object.assign(message.style, { margin:"0", color:"var(--app-text-muted)" });
  message.setAttribute("aria-live", "polite");
  message.textContent = "Showing all closures.";
  container.append(help, input, clear, message);
  root.replaceChildren(container);
  let highlight = null;
  let generation = 0;
  const escapeSql = value => String(value).replace(/'/g, "''");
  const clause = () => {
    const search = String(input.value || "").trim();
    return search ? `UPPER(${app.config.roadField}) LIKE UPPER('%${escapeSql(search)}%')` : "1=1";
  };
  const update = async ({ zoom = false } = {}) => {
    const current = ++generation;
    const where = clause();
    if (highlight) { highlight.remove(); highlight = null; }
    layerView.filter = where === "1=1" ? null : new FeatureFilter({ where });
    message.textContent = "Searching closures…";
    try {
      const query = layer.createQuery();
      query.where = where;
      query.outFields = [layer.objectIdField];
      query.returnGeometry = Boolean(zoom);
      const result = await layer.queryFeatures(query);
      if (current !== generation) return;
      const count = result.features.length;
      message.textContent = count === 0 ? "No closures match this road name." : `${count} closure${count === 1 ? "" : "s"} shown.`;
      if (zoom && count > 0) {
        highlight = layerView.highlight(result.features);
        await app.view.goTo(result.features, { duration: 500 });
        if (current !== generation) return;
        const firstMatch = result.features[0];
        const objectId = firstMatch?.attributes?.[layer.objectIdField];
        if (objectId !== null && objectId !== undefined && app.actions.has("show-closure-details")) {
          await app.actions.invoke("show-closure-details", { objectId });
        }
      }
    } catch (error) {
      if (current !== generation) return;
      message.textContent = "Unable to search closures.";
    }
  };
  const onClear = () => { input.value = ""; void update({ zoom: false }); };
  const onKey = event => { if (event.key === "Enter") void update({ zoom: true }); };
  clear.addEventListener("click", onClear);
  input.addEventListener("keydown", onKey);
  app.onCleanup(() => {
    clear.removeEventListener("click", onClear);
    input.removeEventListener("keydown", onKey);
    if (highlight) highlight.remove();
    layerView.filter = null;
    root.replaceChildren();
  });
}