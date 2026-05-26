// import type { PluginOption } from 'vite'
// import fs from 'fs-extra'
// import path from 'path'
// import { SingleBar } from 'cli-progress'
// import chalk from 'chalk'

// export default function copyDistPlugin (targetDir: string): PluginOption {
//     return {
//         name: 'vite-plugin-copy-dist',
//         apply: 'build',
//         async closeBundle () {
//             const sourceDir = path.resolve(__dirname, '../../dist')
//             const finalTarget = path.resolve(targetDir)

//             // 1. 初始化进度条
//             const progressBar = new SingleBar({
//                 format: `📦 ${chalk.cyan('复制进度')} | ${chalk.green('{bar}')} | {percentage}% | {total} 文件`,
//                 barCompleteChar: '█',
//                 barIncompleteChar: '░',
//                 hideCursor: true
//             })
//             try {
//                 // 2. 获取待复制的文件总数
//                 const files = await getFilesCount(sourceDir)
//                 progressBar.start(files, 0)

//                 // 3. 删除目标文件
//                 await fs.remove(finalTarget)

//                 // 4. 复制文件（带进度回调）
//                 await fs.copy(sourceDir, finalTarget, {
//                     overwrite: true,
//                     filter: () => {
//                         progressBar.increment()
//                         return true
//                     }
//                 })
//                 // 5. 完成提示
//                 progressBar.stop()
//                 console.log(chalk.bold.green(`\n✅ 成功复制到: ${chalk.underline(finalTarget)}\n`))
//             } catch (err) {
//                 progressBar.stop()
//                 console.error(chalk.bold.red('\n❌ 复制失败:'), err)
//                 process.exit(1)
//             }
//         }
//     }
// }

// // 递归计算文件总数
// async function getFilesCount(dir: string): Promise<number> {
//     let count = 0
//     const items = await fs.readdir(dir)

//     for (const item of items) {
//         const fullPath = path.join(dir, item)
//         const stat = await fs.stat(fullPath)
//         count += stat.isDirectory() ? await getFilesCount(fullPath) : 1
//     }

//     return count
// }