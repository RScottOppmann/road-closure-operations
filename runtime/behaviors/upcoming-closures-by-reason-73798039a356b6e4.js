export default async function install(app) {
  const mount = app.getMount("upcoming-closures-by-reason");
  const layer = app.layers[app.config.layerId];
  if (!layer) throw new Error("Closure layer is unavailable.");
  await layer.load();

  const root = document.createElement("div");
  root.style.display = "grid";
  root.style.gap = "0.35rem";
  root.style.minWidth = "0";
  const total = document.createElement("div");
  total.style.fontSize = "1.6rem";
  total.style.fontWeight = "700";
  total.textContent = "Loading…";
  const label = document.createElement("div");
  label.textContent = "closures starting today or later";
  label.style.color = "var(--app-text-muted)";
  const breakdown = document.createElement("div");
  breakdown.style.display = "flex";
  breakdown.style.flexWrap = "wrap";
  breakdown.style.gap = "0.35rem";
  root.append(total, label, breakdown);
  mount.replaceChildren(root);

  let generation = 0;
  const refresh = async () => {
    const current = ++generation;
    total.textContent = "Loading…";
    breakdown.replaceChildren();
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateText = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const query = layer.createQuery();
      query.where = `${app.config.startDateField} >= DATE '${dateText}'`;
      query.groupByFieldsForStatistics = [app.config.reasonField];
      query.outStatistics = [{ statisticType: "count", onStatisticField: layer.objectIdField, outStatisticFieldName: "closure_count" }];
      query.orderByFields = ["closure_count DESC"];
      query.returnGeometry = false;
      const result = await layer.queryFeatures(query);
      if (current !== generation) return;
      const count = result.features.reduce((sum, feature) => sum + Number(feature.attributes.closure_count || 0), 0);
      total.textContent = count.toLocaleString();
      if (count === 0) {
        const empty = document.createElement("span");
        empty.textContent = "No current or future closures";
        empty.style.color = "var(--app-text-muted)";
        breakdown.append(empty);
        return;
      }
      for (const feature of result.features) {
        const reason = String(feature.attributes[app.config.reasonField] ?? "Unspecified").trim() || "Unspecified";
        const chip = document.createElement("calcite-chip");
        chip.setAttribute("label", `${reason}: ${feature.attributes.closure_count}`);
        chip.textContent = `${reason}: ${feature.attributes.closure_count}`;
        breakdown.append(chip);
      }
    } catch (error) {
      if (current !== generation) return;
      total.textContent = "Unavailable";
      const failed = document.createElement("span");
      failed.textContent = "Unable to summarize closures.";
      failed.style.color = "var(--app-text-muted)";
      breakdown.replaceChildren(failed);
    }
  };
  await refresh();
  const now = new Date();
  const nextDay = new Date(now);
  nextDay.setHours(24, 0, 5, 0);
  const timer = setTimeout(() => { void refresh(); }, Math.max(1000, nextDay.getTime() - now.getTime()));
  app.onCleanup(() => {
    clearTimeout(timer);
    mount.replaceChildren();
  });
}