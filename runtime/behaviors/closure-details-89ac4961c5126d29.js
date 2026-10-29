export default async function install(app) {
  const mount = app.getMount("closure-details");
  let request = 0;
  const makeText = (tag, text) => { const el = document.createElement(tag); el.textContent = text; return el; };
  const value = (input) => input === null || input === undefined || input === "" ? "Not provided" : String(input);
  const formatDate = (input) => { if (!input) return "Not scheduled"; const date = new Date(input); return Number.isNaN(date.getTime()) ? String(input) : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }); };
  const makeSection = (title, rows) => {
    const section = document.createElement("div");
    Object.assign(section.style, { padding:"0.65rem", border:"1px solid var(--app-border-subtle)", borderRadius:"var(--app-radius)", background:"var(--app-surface-raised)" });
    const heading = makeText("div", title);
    Object.assign(heading.style, { fontSize:"0.75rem", fontWeight:"700", letterSpacing:"0.04em", textTransform:"uppercase", color:"var(--app-text-muted)" });
    section.append(heading);
    for (const [label, text] of rows) {
      const row = document.createElement("div");
      Object.assign(row.style, { display:"grid", gridTemplateColumns:"minmax(5.5rem, 0.9fr) minmax(0, 1.4fr)", gap:"0.5rem", paddingTop:"0.42rem" });
      const key = makeText("span", label); key.style.color = "var(--app-text-muted)";
      const answer = makeText("span", value(text)); Object.assign(answer.style, { minWidth:"0", overflowWrap:"anywhere" });
      row.append(key, answer); section.append(row);
    }
    return section;
  };
  const renderIdle = () => {
    const card = document.createElement("div");
    Object.assign(card.style, { marginTop:"0.7rem", padding:"0.85rem", border:"1px dashed var(--app-border)", borderRadius:"var(--app-radius)", color:"var(--app-text-muted)" });
    const heading = makeText("strong", "Ready to inspect a closure");
    const message = makeText("p", "Select a closure line on the map or search by road name to see its operational status, schedule, impacts, and contact details."); message.style.margin = "0.45rem 0 0";
    card.append(heading, message); mount.replaceChildren(card);
  };
  renderIdle();
  app.actions.register("show-closure-details", async ({ graphic, objectId } = {}) => {
    const current = ++request;
    const resolvedId = objectId ?? graphic?.getObjectId?.();
    if (resolvedId === null || resolvedId === undefined) return;
    const loading = makeText("p", "Loading selected closure…"); Object.assign(loading.style, { marginTop:"0.7rem", color:"var(--app-text-muted)" }); mount.replaceChildren(loading);
    try {
      const layer = app.layers[app.config.layerId];
      const result = await layer.queryFeatures({ objectIds:[resolvedId], outFields:["street","direction","reason","laneimpact","accessallowed","description","starttime","endtime","altroute","pocname","pocemail","pocphone","activeincid"], returnGeometry:false });
      if (current !== request) return;
      const feature = result.features[0];
      if (!feature) { mount.replaceChildren(makeText("p", "Closure details are unavailable.")); return; }
      const a = feature.attributes || {};
      const root = document.createElement("div"); Object.assign(root.style, { display:"grid", gap:"0.6rem", marginTop:"0.7rem" });
      const banner = document.createElement("div");
      Object.assign(banner.style, { padding:"0.85rem", borderLeft:`4px solid ${String(a.activeincid).toLowerCase() === "yes" ? "var(--calcite-color-status-danger)" : "var(--app-accent)"}`, background:"var(--app-surface-raised)" });
      const title = makeText("div", a.street || "Road closure"); Object.assign(title.style, { fontSize:"1.1rem", fontWeight:"700" }); banner.append(title);
      if (String(a.activeincid).toLowerCase() === "yes") { const badge = document.createElement("calcite-chip"); badge.setAttribute("label", "Active closure"); badge.textContent = "Active"; badge.style.marginTop = "0.5rem"; banner.append(badge); }
      root.append(banner);
      root.append(makeSection("Operational impact", [["Reason",a.reason],["Direction",a.direction],["Lane impact",a.laneimpact],["Access",a.accessallowed]]));
      root.append(makeSection("Schedule", [["Starts",formatDate(a.starttime)],["Ends",formatDate(a.endtime)]]));
      if (a.description || a.altroute) root.append(makeSection("Field notes", [["Alternate route",a.altroute],["Details",a.description]]));
      root.append(makeSection("Contact", [["Name",a.pocname],["Email",a.pocemail],["Phone",a.pocphone]]));
      mount.replaceChildren(root);
    } catch (error) {
      if (current !== request) return;
      const failed = makeText("p", "Unable to load closure details. Select the closure again to retry."); Object.assign(failed.style, { marginTop:"0.7rem", color:"var(--calcite-color-status-danger)" }); mount.replaceChildren(failed);
    }
  });
  app.onCleanup(() => mount.replaceChildren());
}