require('yamlify/register')

const fs = require('fs')
const yaml = require('js-yaml')
const glob = require('glob')
const objMerge = require('object-merge')


class LocalsLoader {
    constructor (options, locals) {
        this.opts = options
        this.locals = locals
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

                let fileref = (refPath[0] === undefined) ? load_obj.name : refPath[0]
                refs = { [fileref]: content }

                refPath.forEach(
                    (key, index) => {
                        let localKey = (key == 'components')
                            ? load_obj.name
                            : key
                        !(refs[key])
                            ? ( refs = { [localKey]: refs } )
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
                Object.keys(this.loadedLocals).forEach(
                    (key) => {
                        delete this.loadedLocals[key]
                    }
                )

                if (this.opts) {
                    this.opts.forEach(
                        (local) => {
                            this.file_to_locals(local, compilation)
                            this.file_to_json(local)
                        }
                    )
                }
                // Object.keys(this.loadedlocals).forEach(
                //     (key) => delete this.locals[key]
                // )
                // Object.keys(this.loadedLocals).forEach(
                //     (key) => {
                //         if (this.locals[key]) delete this.locals[key]
                //     }
                // )

                // this.locals = Object.assign(
                //     this.locals,
                //     this.loadedLocals
                // )

                Object.entries(this.loadedLocals).forEach(
                    ([key, value]) => {
                        this.locals[key] = value
                    }
                )
            }
        )

        compiler.plugin(
            'watch-run',
            (watching, callback) => {
                watching.compiler.plugin(
                    'compilation',
                    (compilation) => {
                        Object.keys(this.loadedLocals).forEach(
                            (key) => {
                                delete this.loadedLocals[key]
                            }
                        )

                        if (this.opts) {
                            this.opts.forEach(
                                (local) => {
                                    this.file_to_locals(local, compilation)
                                    this.file_to_json(local)
                                }
                            )
                        }

                        Object.entries(this.loadedLocals).forEach(
                            ([key, value]) => {
                                this.locals[key] = value
                            }
                        )
                    }
                )

                callback()
            }
        )

        return
    }

}

module.exports = LocalsLoader
