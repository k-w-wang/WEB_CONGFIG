const express = require('express')
const app = express();
const path = require('path');
const port = 9003;
const fs_1 = require("fs");
const appRoot = () => fs_1.realpathSync(process.cwd());
const CONFIG_FILE = path.resolve(appRoot(), "proxy.config.json");
console.log(CONFIG_FILE);
let proxys = [];

const loadFromDisk = () => {
  try {
    proxys = JSON.parse(fs_1.readFileSync(CONFIG_FILE, "utf-8").toString());
  }
  catch (e) { }
};
const syncToDisk = () => {
  fs_1.writeFileSync(CONFIG_FILE, JSON.stringify(proxys, (key, value) => {
      return key === "enabled" ? undefined : value;
  }, "  "), "utf-8");
};
loadFromDisk();

app.use(express.static(path.join(__dirname, 'build')))

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "build/index.html"));
});

const generateRuleId = () => Math.random()
    .toString(36)
    .substring(2) + new Date().getTime().toString(36);
app.use(express.json()) 
app.get('/api/v6/pages', function (req, res, next) {
  console.log(req.url);
  res.send({ data: [{ name: "app", title: "Hllo cicli" }], row: 0 })
})
app.get("/api/v1/proxys", (req, res) => {
  res.send({ data: proxys, row: proxys.length })
});
app.put("/api/v1/proxys/:proxyId", (req, res) => {
  proxys = proxys.map(proxy => {
    if (proxy.proxyId === req.params.proxyId) {
      return Object.assign({}, proxy, { enabled: req.body.enabled });
    }
    else {
      return proxy;
    }
  });
  res.json({
    success: true
  });
});
app.post("/api/v1/proxys", (req, res) => {
  if(req.body) {
    const proxy = Object.assign({}, req.body, {
      proxyId: generateRuleId(),
    });
    proxys.unshift(proxy);
    syncToDisk();
    res.json({
      success: true
    });
  }else {
    res.json({
      success: false
    });
  }
});
app.put("/api/v1/proxys", (req, res) => {
  if(req.body) {
    proxys = proxys.map((proxy)=>{
      if(proxy.proxyId === req.body.proxyId) {
        return req.body
      }else {
        return proxy
      }
    })
    syncToDisk();
    res.json({
      success: true
    });
  }else {
    res.json({
      success: false
    });
  }
});
app.delete("/api/v1/proxys/:proxyId", (req, res) => {
  if(req.params) {
    proxys = proxys.filter((proxy)=>{
      return proxy.proxyId !== req.params.proxyId
    })
    syncToDisk()
    res.json({
      success: true
    });
  }else {
    res.json({
      success: false
    });
  }
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})