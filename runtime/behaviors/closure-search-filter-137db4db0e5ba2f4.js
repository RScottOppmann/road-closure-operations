export default async function install(app) {
  const root = app.getMount("closure-search-filter");
  const [FeatureFilter] = await Promise.all([
    app.import("esri/layers/support/FeatureFilter")
  ]);
  const layer = app.layers[app.config.layerId];
  if (!layer) throw new Error("Closure layer is unavailable.");
  await layer.load();
  const layerView = await app.view.whenLayerView(layer);

  const container = document.createElement("div");
  container.style.display = "grid";
  container.style.gap = "0.65rem";
  container.style.minWidth = "0";

  const help = document.createElement("p");
  help.textContent = "Search by road name or Closure ID, then narrow the map by active status.";
  help.style.margin = "0";
  help.style.color = "var(--app-text-muted)";

  const input = document.createElement("calcite-input-text");
  input.setAttribute("placeholder", "Road name or Closure ID");
  input.setAttribute("label", "Road name or Closure ID");
  input.setAttribute("clearable", "");

  const status = document.createElement("calcite-select");
  status.setAttribute("label", "Closure status");
  const statuses = [
    ["", "All statuses"],
    ["Yes", "Active"],
    ["No", "Inactive"]
  ];
  for (const [value, label] of statuses) {
    const option = document.createElement("calcite-option");
    option.value = value;
    option.textContent = label;
    status.append(option);
  }

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "0.5rem";
  const apply = document.createElement("calcite-button");
  apply.textContent = "Find closures";
  apply.setAttribute("width", "full");
  const clear = document.createElement("calcite-button");
  clear.textContent = "Clear";
  clear.setAttribute("appearance", "outline");
  actions.append(apply, clear);

  const message = document.createElement("p");
  message.style.margin = "0";
  message.style.color = "var(--app-text-muted)";
  message.setAttribute("aria-live", "polite");
  message.textContent = "Showing all closures.";
  container.append(help, input, status, actions, message);
  root.replaceChildren(container);

  let highlight = null;
  let generation = 0;
  const escapeSql = (value) => String(value).replace(/'/g, "''");
  const clause = () => {
    const terms = [];
    const search = String(input.value || "").trim();
    const statusValue = String(status.value || "").trim();
    if (search) {
      const safe = escapeSql(search);
      terms.push(`(UPPER(${app.config.roadField}) LIKE UPPER('%${safe}%') OR UPPER(${app.config.closureIdField}) LIKE UPPER('%${safe}%'))`);
    }
    if (statusValue) terms.push(`${app.config.statusField} = '${escapeSql(statusValue)}'`);
    return terms.length ? terms.join(" AND ") : "1=1";
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
      message.textContent = count === 0 ? "No closures match these criteria." : `${count} closure${count === 1 ? "" : "s"} shown.`;
      if (zoom && count > 0) {
        highlight = layerView.highlight(result.features);
        await app.view.goTo(result.features, { duration: 500 });
      }
    } catch (error) {
      if (current !== generation) return;
      message.textContent = "Unable to search closures.";
    }
  };
  const onApply = () => { void update({ zoom: true }); };
  const onClear = () => {
    input.value = "";
    status.value = "";
    void update({ zoom: false });
  };
  const onStatus = () => { void update({ zoom: false }); };
  const onKey = (event) => { if (event.key === "Enter") onApply(); };
  apply.addEventListener("click", onApply);
  clear.addEventListener("click", onClear);
  status.addEventListener("calciteSelectChange", onStatus);
  input.addEventListener("keydown", onKey);
  app.onCleanup(() => {
    apply.removeEventListener("click", onApply);
    clear.removeEventListener("click", onClear);
    status.removeEventListener("calciteSelectChange", onStatus);
    input.removeEventListener("keydown", onKey);
    if (highlight) highlight.remove();
    layerView.filter = null;
    root.replaceChildren();
  });
}