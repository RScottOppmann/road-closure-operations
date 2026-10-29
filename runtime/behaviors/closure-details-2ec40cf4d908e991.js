export default async function install(app) {
  const mount = app.getMount("closure-details");
  const idle = document.createElement("p");
  idle.textContent = "Select a closure line on the map to review its location, timing, impacts, and contact information.";
  mount.replaceChildren(idle);

  let request = 0;
  const showField = (parent, label, value) => {
    if (value === null || value === undefined || value === "") return;
    const row = document.createElement("div");
    const key = document.createElement("strong");
    key.textContent = `${label}: `;
    const text = document.createElement("span");
    text.textContent = String(value);
    row.append(key, text);
    parent.append(row);
  };
  const formatDate = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  };

  app.actions.register("show-closure-details", async ({ graphic }) => {
    const token = ++request;
    const loading = document.createElement("p");
    loading.textContent = "Loading closure details…";
    mount.replaceChildren(loading);
    try {
      const layer = app.layers[app.config.layerId];
      const objectId = graphic.getObjectId();
      const result = await layer.queryFeatures({
        objectIds: [objectId],
        outFields: ["street", "direction", "reason", "laneimpact", "accessallowed", "description", "starttime", "endtime", "altroute", "pocname", "pocemail", "pocphone", "activeincid"],
        returnGeometry: false
      });
      if (token !== request) return;
      const feature = result.features[0];
      if (!feature) {
        mount.replaceChildren(Object.assign(document.createElement("p"), { textContent: "Closure details are unavailable." }));
        return;
      }
      const a = feature.attributes || {};
      const content = document.createElement("div");
      const heading = document.createElement("h3");
      heading.textContent = a.street || "Road closure";
      content.append(heading);
      showField(content, "Status", a.activeincid);
      showField(content, "Direction", a.direction);
      showField(content, "Reason", a.reason);
      showField(content, "Lane impact", a.laneimpact);
      showField(content, "Access", a.accessallowed);
      showField(content, "Starts", formatDate(a.starttime));
      showField(content, "Ends", formatDate(a.endtime));
      showField(content, "Alternate route", a.altroute);
      showField(content, "Description", a.description);
      showField(content, "Contact", a.pocname);
      showField(content, "Email", a.pocemail);
      showField(content, "Phone", a.pocphone);
      mount.replaceChildren(content);
    } catch (error) {
      if (token !== request) return;
      mount.replaceChildren(Object.assign(document.createElement("p"), { textContent: "Unable to load closure details." }));
    }
  });
  app.onCleanup(() => mount.replaceChildren());
}