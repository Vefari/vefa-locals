require('yamlify/register')

const fs = require('fs')
const yaml = require('js-yaml')
const glob = require('glob')
const objMerge = require('object-merge')


class LocalsLoader {
    constructor (options, locals) {
        this.opts = options
        this.locals = locals
        this.locals.load = false
        this.loadedLocals = {}
    }

    file_to_locals (load_obj, compilation) {
        let refs = {}

        let files = glob.sync(
            path.resolve(process.cwd(), `${ load_obj.dir }/**/*.yaml`)
        )

        files.forEach(
            file => {
                let content = yaml.load(fs.readFileSync(file))
                let refPath = file.split(load_obj.dir).pop().split('/')
                let lastEntry = refPath[refPath.length - 1]
                refPath[refPath.length - 1] = lastEntry.replace('.yaml', '')
                if (lastEntry == 'data.yaml') refPath.pop()

                refPath.shift()
                refPath = refPath.reverse()
                refs = { [refPath[0]]: content }

                refPath.forEach(
                    (key, index) => {
                        !(refs[key])
                            ? ( refs = { [key]: refs } )
                            : refs
                    }
                )

                this.loadedLocals = objMerge(
                    this.loadedLocals,
                    refs
                )
            }
        )
    }

    file_to_json (load_obj) {
        if (load_obj.output) {
            let output = load_obj.output

            let files = glob.sync(
                path.resolve(process.cwd(), `${ load_obj.dir }**/*.yaml`)
            )

            if (!fs.existsSync(output.dir)) fs.mkdirSync(output.dir)

            files.forEach(
                file => {
                    if (!output.files || output.files.includes(file)) {
                        file = file.split("/").pop()
                        file = file.split(".").shift()

                        fs.writeFileSync(
                            `${ output.dir }/${ file }.json`,
                            JSON.stringify(this.loadedLocals[file])
                        )
                    }
                }
            )
        }
    }

    apply (compiler) {
        compiler.plugin(
            'compilation',
            (compilation) => {
                if (this.opts) {
                    this.opts.forEach(
                        (local) => {
                            this.file_to_locals(local, compilation)
                            this.file_to_json(local)
                        }
                    )
                }
                this.locals = Object.assign(
                    this.locals,
                    this.loadedLocals
                )
            }
        )

        compiler.plugin(
            'watch-run',
            (watching, callback) => {
                watching.compiler.plugin(
                    'compilation',
                    (compilation) => {
                        if (this.opts) {
                            this.opts.forEach(
                                (local) => {
                                    this.file_to_locals(local, compilation)
                                    this.file_to_json(local)
                                }
                            )
                        }
                    }
                )

                callback()
            }
        )

        return
    }

}

module.exports = LocalsLoader
