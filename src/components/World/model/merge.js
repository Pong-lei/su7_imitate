const fs = require('fs');
const path = require('path');

// 定义输入文件夹和输出文件路径
const inputFolder = './outlines';
const outputFile = './output_file.json';

// 创建一个空的数组来存储所有的points对象
let allPoints = [];

// 读取输入文件夹中的所有文件
fs.readdir(inputFolder, (err, files) => {
    if (err) {
        console.error('Error reading input folder:', err);
        return;
    }

    // 递归处理每个文件
    processFiles(files, 0, () => {
        // 在所有文件处理完成后，将合并的points数组写入输出文件中
        fs.writeFile(outputFile, JSON.stringify({ points: allPoints }), err => {
            if (err) {
                console.error('Error writing output file:', err);
                return;
            }
            console.log('Points merged successfully!');
        });
    });
});

// 处理每个文件
function processFiles(files, index, callback) {
    if (index === files.length) {
        // 所有文件处理完成后调用回调函数
        callback();
        return;
    }

    const file = files[index];
    const filePath = path.join(inputFolder, file);

    // 读取文件内容
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading file:', err);
            return;
        }

        // 解析文件内容为JSON格式
        const fileContent = JSON.parse(data);

        // 提取points数组并合并到allPoints数组中
        if (fileContent.points) {
            allPoints.push(fileContent.points);
        }

        // 处理下一个文件
        processFiles(files, index + 1, callback);
    });
}


