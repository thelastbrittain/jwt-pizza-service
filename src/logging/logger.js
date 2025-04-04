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
    console.log(`Here is the info: userID: ${config.logging.userId}, api: ${config.logging.apiKey},
      url: ${config.logging.url} `);
    fetch(`${config.logging.url}`, {
      method: "post",
      body: JSON.stringify(event),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.logging.userId}:${config.logging.apiKey}`,
      },
    })
      .then(async (res) => {
        console.log("Response status:", res.status);

        // Handle 204 No Content
        if (res.status === 204) {
          console.log("No content returned from Grafana (status 204).");
          return null; // No need to parse JSON
        }

        // Handle other success responses
        if (!res.ok) {
          console.error("Failed to send log to Grafana");
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        // Parse JSON for non-204 responses
        const contentType = res.headers.get("Content-Type");
        if (contentType && contentType.includes("application/json")) {
          return res.json(); // Parse JSON if applicable
        } else {
          console.warn("Non-JSON response received");
          return null; // Handle non-JSON responses gracefully
        }
      })
      .then((data) => {
        if (data) {
          console.log("Response data:", data);
        }
        console.log("Sent logs to Grafana successfully.");
      })
      .catch((err) => {
        console.error("Error sending log to Grafana:", err);
      });
  }
}
module.exports = new Logger();
