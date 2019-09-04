let csv = require('csv-parser');
const fs = require('fs')

var output = [];

fs.createReadStream('hygdata_v3.csv')
.pipe(csv())
.on('data', (row) => {
    output.push(row)
})
.on('end', () => {
    console.log('finished');
    fs.writeFileSync('hygdata_v3.json' , JSON.stringify(output))
    fs.writeFileSync('hygdata_sample.json', JSON.stringify(output[0]))
    output.sort((a,b) => {
        return a.mag - b.mag
    })
    fs.writeFileSync('hygdata_short.json', JSON.stringify(output.slice(0, 1000)))
})