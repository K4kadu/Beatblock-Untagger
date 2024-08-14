console.log("Running untagger.js");

const fs = require("fs"),
    json = {
        read: (filepath, callback) => {
            fs.readFile(filepath, (e, jsonData) => {
                if (e) throw e;
                console.log(`   File ${filepath} read.`);
                callback && callback(JSON.parse(jsonData));
            });
        },
        overwrite: (filepath, json) => {
            fs.writeFile(filepath, JSON.stringify(json), e => {
                if (e) throw e;
                console.log(`   File ${filepath} Overwritten.`);
            });
        },
        delete: (filepath) => {
            fs.unlink(filepath, function (e) {
                if (e) throw e;
                console.log(`   File ${filepath} deleted.`);
            });
        }
    },
    belongsToChart = ["block", "hold", "inverse", "mine", "mineHold", "side", "extraTap"];
let tag, tempTagEvents, untaggedEvents = [], runTagEventsUntagged = 0, recursions = 0;
function unTagger(level, chart) {
    if (recursions > 100) {
        console.log("The maximum recursion limit (100) has been reached. Something probably broke.");
        return;
    }
    // Check for valid Run Tag Event
    tag = level.events.reduce((tag, event) => { return tag ? tag : event.type == "tag" && event.tag != "" && event.tag }, false);
    if (tag === false) {
        json.overwrite("level.json", level), json.overwrite("chart.json", chart);
        return;
    }
    // Require Tag Data
    console.log(`Untagging ${tag}.`),
        json.read(`tags/${tag}.json`, tagEvents => {
            if (tag == "[]") { console.log("Nothing in the Tag."); }
            // Warnings
            tagEvents.some(event => event.type == "play") && (console.log("Play Song Events in Tags may lead to duplicates when untagging.")),
                tagEvents.some(event => event.type == "showResults") && (console.log("Show Results Events in Tags may lead to duplicates when untagging.")),
                tagEvents.some(event => event.type == "bookmark") && (console.log("Bookmark Events don't belong in Tags."));
            // Untagging
            for (let index = 0; index < level.events.length; index++) {
                const event = level.events[index];
                if (event.type != "tag" || event.tag != tag) { continue; }
                tempTagEvents = JSON.parse(JSON.stringify(tagEvents)); // Unpointer Code
                for (const i in tempTagEvents) {
                    tempTagEvents[i].time = tagEvents[i].time + event.time;
                    event.angleOffset && (tempTagEvents[i].angle = tagEvents[i].angle + event.angle);
                }
                untaggedEvents.push(...tempTagEvents), level.events.splice(index, 1).map(event2 => event2.time), index--, runTagEventsUntagged++;
            }
            // Warning
            if (untaggedEvents.length == 0) { console.log("Nothing to untag."); }
            // Update with new data
            level.events.push(...untaggedEvents.filter((event => !belongsToChart.includes(event.type)))),
                chart.push(...untaggedEvents.filter((event => belongsToChart.includes(event.type)))),
                json.delete(`tags/${tag}.json`), recursions++, unTagger(level, chart);
        });
}

json.read("level.json", level => {
    json.read("chart.json", chart => {
        unTagger(level, chart),
            console.log("Done!"),
            console.log("Run Tag Events Untagged: " + runTagEventsUntagged + "\nRecursion depth: " + recursions);
    })
});