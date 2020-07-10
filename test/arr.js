
const fruits = ['apple', 'grape', 'pear']

let obj = {"tag": {}, "field": {}}


const run = async () => {
    for await (fruit of fruits) {
        obj.tag.test = "test" in obj.tag ? obj.tag.test.concat([fruit]) : [fruit]
    }
    console.dir(obj)
};

run();