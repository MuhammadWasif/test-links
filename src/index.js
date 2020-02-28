#!/usr/bin/env node
const request = require("request");
const fs = require("fs");
const chalk = require("chalk");
const http = require("http");
const randomKey = require("random-key");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;

// variables
let htmlFileName = randomKey.generate();
let port = 6000;
const websiteURL = process.argv.splice(2)[0];
let brokenLinks = [],
  correctLinks = [];

if (!websiteURL.startsWith("http")) {
  console.log("URL is badly formatted");
  process.exit();
}

console.log(`process is running...`);

/*
First, download the HTML of given web page by making a GET request.
Create an HTML file and host it locally. Make a request on localhost.
This step is necessary to get all links from DOM.
*/

request(websiteURL, (er, res, data) => {
  if (er) {
    console.log("🙁 An error occured! Please try again!");
    process.exit();
  } else {
    const body = res.body;

    fs.writeFile(`${htmlFileName}.html`, body, er => {
      console.log(chalk.green("Got all the links!"));
      let server = http.createServer((reqt, rest) => {
        fs.readFile(`${htmlFileName}.html`, (er, data) => {
          rest.write(data);
          rest.end();
        });
      });

      server.listen(port, () => {
        console.log(
          chalk.bold(
            `😃 listening on ${chalk.underline(`http://localhost:${port}`)}`
          )
        );
        // fucntion that make a GET request on every URL to check if it's not broken
        request(`http://localhost:${port}`, (er, response) => {
          const body = response.body;
          const dom = new JSDOM(body);
          let links = [];
          for (let link of dom.window.document.links) links.push(link.href);
          const linksFiltered = links.filter(e => e.startsWith("http"));
          let uniqueLinks = [...new Set(linksFiltered)];
          console.log(`🚀 ${uniqueLinks.length} unique URLs found on website`);
          // Recursion function that send request once one request is completed
          function loop(n) {
            if (uniqueLinks[n - 1] == undefined) {
              console.log("😕 No links were found on website");
              process.exit();
            }
            request(uniqueLinks[n - 1], (er, data) => {
              if (er) return er;
              let statusCode = data.statusCode;
              // status code "404" means URLs is broken
              if (statusCode != 404) {
                console.log(chalk.green(`SUCCESS`), uniqueLinks[n - 1]);
                correctLinks.push(uniqueLinks[n - 1]);
                if (n == uniqueLinks.length) {
                  console.log("✔ all links have been checked!");
                  console.log(`${brokenLinks.length} broken link(s) found!`);

                  fs.unlink(`${htmlFileName}.html`, (er, res) => {
                    if (er) throw er;
                  });
                  process.exit();
                } else {
                  n++;
                  loop(n);
                }
              } else {
                console.log(chalk.red(`BROKEN`), uniqueLinks[n - 1]);
                brokenLinks.push(uniqueLinks[n - 1]);
                if (n == uniqueLinks.length) {
                  console.log("✔ all links have been checked!");
                  console.log(`${brokenLinks.length} broken link(s) found!`);
                  fs.unlink(`${htmlFileName}.html`, (er, res) => {
                    if (er) throw er;
                  });
                  process.exit();
                } else {
                  n++;
                  loop(n);
                }
              }
            });
          }
          loop(1);
        });
      });
    });
  }
});
