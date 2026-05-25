const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const port = 9224;
const appPort = Number(process.env.APP_PORT || process.env.PORT || 4173);
const userDataDir = path.join(os.tmpdir(), `sorting-hat-edge-${Date.now()}`);

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(url) {
  const response = await fetch(url);
  return response.json();
}

async function waitForCdp() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      return await readJson(`http://127.0.0.1:${port}/json/version`);
    } catch {
      await delay(100);
    }
  }
  throw new Error("CDP endpoint did not become available");
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();

  ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  };

  return new Promise((resolve, reject) => {
    ws.onopen = () => {
      resolve({
        send(method, params = {}, sessionId) {
          const message = { id: ++id, method, params };
          if (sessionId) message.sessionId = sessionId;
          ws.send(JSON.stringify(message));
          return new Promise((resolveSend, rejectSend) => {
            pending.set(id, { resolve: resolveSend, reject: rejectSend });
          });
        },
        close() {
          ws.close();
        },
      });
    };
    ws.onerror = reject;
  });
}

async function main() {
  const edge = spawn(edgePath, [
    "--headless=new",
    "--disable-gpu",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    "about:blank",
  ], { stdio: "ignore" });

  let cdp;
  try {
    const version = await waitForCdp();
    cdp = await connect(version.webSocketDebuggerUrl);
    const target = await cdp.send("Target.createTarget", {
      url: `http://localhost:${appPort}/`,
    });
    const attached = await cdp.send("Target.attachToTarget", {
      targetId: target.targetId,
      flatten: true,
    });
    const sessionId = attached.sessionId;

    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 950,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);
    await delay(700);

    const result = await cdp.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const pick = (index, option) => {
          const tab = document.querySelector('[data-action="stage"][data-index="' + index + '"]');
          if (tab) tab.click();
          const api = window.__sortingHat || window.__routingInstrument;
          const stage = api.stages[index];
          api.state.selections[stage.id] = option;
          api.state.stage = Math.min(index + 1, api.stages.length - 1);
          api.render();
        };
        pick(0, "shipping");
        await wait(80);
        pick(1, "engineering");
        await wait(80);
        pick(2, "route");
        await wait(120);
        const snap = (window.__sortingHat || window.__routingInstrument).snapshot();
        return {
          name: snap.routing_mark.name,
          source: snap.source,
          complete: Boolean(snap.routing_mark.state && snap.routing_mark.contribution && snap.routing_mark.surface),
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`,
    }, sessionId);

    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.text || "flow evaluation failed");
    }

    const value = result.result.value;
    if (!value.complete || value.source !== "sorting-hat-click-drag-routing-demo") {
      throw new Error(JSON.stringify(value, null, 2));
    }

    const shot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    }, sessionId);
    fs.writeFileSync("prototype-sorting-hat.png", Buffer.from(shot.data, "base64"));

    await cdp.send("Page.navigate", {
      url: `http://localhost:${appPort}/mark-composer.html`,
    }, sessionId);
    await delay(700);

    const composerResult = await cdp.send("Runtime.evaluate", {
      awaitPromise: true,
      returnByValue: true,
      expression: `(async () => {
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const api = window.__markComposer;
        api.state.selections.color = "shipping";
        api.state.selections.shape = "engineering";
        api.state.selections.texture = "route";
        api.state.stage = 2;
        api.render();
        await wait(120);
        const snap = api.snapshot();
        return {
          title: document.title,
          name: snap.routing_mark.name,
          source: snap.source,
          complete: Boolean(snap.routing_mark.color && snap.routing_mark.shape && snap.routing_mark.texture),
          rings: document.querySelectorAll(".layer-ring").length,
          currentOptions: document.querySelectorAll('.option[data-current="true"]').length,
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth
        };
      })()`,
    }, sessionId);

    if (composerResult.exceptionDetails) {
      throw new Error(composerResult.exceptionDetails.text || "mark composer evaluation failed");
    }

    const composerValue = composerResult.result.value;
    if (
      !composerValue.complete ||
      composerValue.source !== "sorting-hat-radial-mark-composer" ||
      composerValue.rings !== 3 ||
      composerValue.currentOptions < 4 ||
      composerValue.scrollWidth > composerValue.clientWidth
    ) {
      throw new Error(JSON.stringify(composerValue, null, 2));
    }

    const composerShot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    }, sessionId);
    fs.writeFileSync("prototype-mark-composer.png", Buffer.from(composerShot.data, "base64"));
    console.log(JSON.stringify({ sortingHat: value, markComposer: composerValue }, null, 2));
  } finally {
    if (cdp) cdp.close();
    edge.kill();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
