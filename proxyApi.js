const http_proxy_1 = require("http-proxy");

const proxy = http_proxy_1.createProxyServer({});
const proxyData = [
  {
    "match": "api/v2",
    "action": "FORWARD",
    "data": "http://172.16.0.46:9001/",
    "description": "ceshi2",
    "ruleId": "6a23rkrsgbl14lk21g",
    "enabled": true
  },
  // {
  //   "match": "api/v1",
  //   "action": "FORWARD",
  //   "data": "http://172.16.0.46:9001/",
  //   "description": "ceshi",
  //   "ruleId": "hibjqvwf3ykl14ljtfx"
  // }
]
const ruleMatchRegExpCache = {};

let proxyHandler = (req, res, next) => {
  if (req.url.match(/api\/v1/)) {
    next();
    return;
  }
  console.log(req.url);
  const matchedRule = proxyData.find(rule => {
    if (!rule.enabled) {
      return false;
    }
    if (!ruleMatchRegExpCache[rule.match]) {
      ruleMatchRegExpCache[rule.match] = new RegExp(rule.match);
    }
    return ruleMatchRegExpCache[rule.match].test(req.url);
  });
  console.log(matchedRule);

  if (matchedRule) {
    if (matchedRule.action === "JSON") {
      res.json(JSON.parse(matchedRule.data));
    }
    else if (matchedRule.action === "FORWARD") {
      proxy.web(req, res, { target: matchedRule.data, changeOrigin: true });
    }
  }
  else {
    next();
  }
};
exports.proxyHandler = proxyHandler