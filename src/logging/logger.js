const config = require("../config");

class Logger {
  httpLogger = (req, res, next) => {
    let send = res.send;
    res.send = (resBody) => {
      const logData = {
        authorized: !!req.headers.authorization,
        path: req.originalUrl,
        method: req.method,
        statusCode: res.statusCode,
        reqBody: JSON.stringify(req.body),
        resBody: JSON.stringify(resBody),
      };
      const level = this.statusToLogLevel(res.statusCode);
      this.log(level, "http", logData);
      res.send = send;
      return res.send(resBody);
    };
    if (next) {
      next();
    }
  };

  log(level, type, logData) {
    const labels = {
      component: config.logging.source,
      level: level,
      type: type,
    };
    const values = [this.nowString(), this.sanitize(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  sqlLogger(sql, params) {
    // console.log("This is the sql: ", sql);
    // console.log("This is the params: ", params);
    const logData = {
      SQL: sql,
      parameters: params,
    };
    // console.log("Log data: ", logData);
    try {
      this.logSQL(logData);
    } catch (error) {
      console.error("Error occured", error);
    }
  }

  logSQL(logData) {
    const labels = {
      component: config.logging.source,
    };
    const values = [this.nowString(), JSON.stringify(logData)];
    const logEvent = { streams: [{ stream: labels, values: [values] }] };

    this.sendLogToGrafana(logEvent);
  }

  logError(error) {
    const logData = {
      message: error.message,
      stack: error.stack,
    };
    this.log("error", "uncaughtExpection", logData);
  }

  statusToLogLevel(statusCode) {
    if (statusCode >= 500) return "error";
    if (statusCode >= 400) return "warn";
    return "info";
  }

  nowString() {
    return (Math.floor(Date.now()) * 1000000).toString();
  }

  sanitize(logData) {
    logData = JSON.stringify(logData);
    return logData.replace(
      /\\"password\\":\s*\\"[^"]*\\"/g,
      '\\"password\\": \\"*****\\"'
    );
  }

  sendLogToGrafana(event) {
    const body = JSON.stringify(event);
    fetch(`${config.logging.url}`, {
      method: "post",
      body: body,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
      },
    })
      .then((res) => {
        if (!res.ok) console.log("Failed to send log to Grafana", res);
      })
      .then(() => {
        console.log("Sent logs to grafana: ");
      });
  }
}
module.exports = new Logger();
