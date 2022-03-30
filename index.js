const express = require('express')
const path = require('path');
const fs_1 = require("fs");
const app = express();
const http_proxy_1 = require("http-proxy");

const proxy = http_proxy_1.createProxyServer({});
proxy.on("error", (err, req, res) => {
  res.writeHead(500, {
      "Content-Type": "text/plain"
  });
  res.end(`proxy: Failed to get response from upstream.`);
});
const appRoot = () => fs_1.realpathSync(process.cwd());
const CONFIG_FILE = path.resolve(appRoot(), "proxy.config.json");

let proxys = [];

const ruleMatchRegExpCache = {};

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

const generateRuleId = () => Math.random()
  .toString(36)
  .substring(2) + new Date().getTime().toString(36);

loadFromDisk();

let proxyHandler = (req, res, next) => {
  if (req.url.match(/CLI\/WEB_CONFIG/)) {
    next();
    return;
  }
  const matchedRule = proxys.find(rule => {
    if (!rule.enabled) {
      return false;
    }
    if (!ruleMatchRegExpCache[rule.match]) {
      ruleMatchRegExpCache[rule.match] = new RegExp(rule.match);
    }
    return ruleMatchRegExpCache[rule.match].test(req.url);
  });
  if (matchedRule) {
    if (matchedRule.action === "json") {
      res.json(JSON.parse(matchedRule.proxyUrl));
    }
    else if (matchedRule.action === "forword") {
      proxy.web(req, res, { target: matchedRule.proxyUrl, changeOrigin: true });
    }
  }
  else {
    next();
  }
};

const CreateProxys = (app) => {
  app.use(express.json())
  app.use(express.static(path.join(__dirname, 'build')))
  app.use(proxyHandler)
  app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "build/index.html"));
  });
  app.get('/CLI/WEB_CONFIG/pages', function (req, res, next) {
    res.send({ data: [{ name: "app", title: "Hllo cicli" }], row: 0 })
  })
  app.get("/CLI/WEB_CONFIG/proxys", (req, res) => {
    res.send({ data: proxys, row: proxys.length })
  });
  app.put("/CLI/WEB_CONFIG/proxys/:proxyId", (req, res) => {
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
  app.post("/CLI/WEB_CONFIG/proxys", (req, res) => {
    if (req.body) {
      const proxy = Object.assign({}, req.body, {
        proxyId: generateRuleId(),
      });
      proxys.unshift(proxy);
      syncToDisk();
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false
      });
    }
  });
  app.put("/CLI/WEB_CONFIG/proxys", (req, res) => {
    if (req.body) {
      proxys = proxys.map((proxy) => {
        if (proxy.proxyId === req.body.proxyId) {
          return req.body
        } else {
          return proxy
        }
      })
      syncToDisk();
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false
      });
    }
  });
  app.delete("/CLI/WEB_CONFIG/proxys/:proxyId", (req, res) => {
    if (req.params) {
      proxys = proxys.filter((proxy) => {
        return proxy.proxyId !== req.params.proxyId
      })
      syncToDisk()
      res.json({
        success: true
      });
    } else {
      res.json({
        success: false
      });
    }
  });

}
// // 本机启动项目
// CreateProxys(app);
// app.listen(9003, () => {
//   console.log(`Example app listening on port ${9003}`)
// })

exports.default = CreateProxys