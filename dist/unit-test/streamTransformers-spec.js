"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stream_1 = require("stream");
const streamTransformers_1 = require("../lib/streamTransformers");
const JSONStream_1 = require("JSONStream");
const chai_1 = require("chai");
describe('streamTransformers', () => {
    describe('arrayToObject', () => {
        it('should convert an array stream to objects', (done) => {
            const metadata = [
                { name: 'id', typeName: 'INTEGER' },
                { name: 'name', typeName: 'VARCHAR' },
            ];
            const arrayStream = new stream_1.Readable({
                read() {
                    this.push(JSON.stringify([
                        [1, 'Jón'],
                        [2, 'Gunna'],
                    ]));
                    this.push(null);
                },
            });
            const transformArraysToObject = (0, streamTransformers_1.arrayToObject)(metadata);
            const parseJSON = (0, JSONStream_1.parse)('*');
            const objectStream = arrayStream
                .pipe(parseJSON)
                .pipe(transformArraysToObject);
            const results = [];
            objectStream.on('data', (data) => {
                results.push(data);
            });
            objectStream.on('end', () => {
                (0, chai_1.expect)(results).to.deep.equal([
                    { id: 1, name: 'Jón' },
                    { id: 2, name: 'Gunna' },
                ]);
                done();
            });
            objectStream.on('error', done);
        });
        it('should throw error when not true json array', (done) => {
            const metadata = [
                { name: 'id', typeName: 'INTEGER' },
                { name: 'name', typeName: 'VARCHAR' },
            ];
            const arrayStream = new stream_1.Readable({
                read() {
                    this.push(JSON.stringify([
                        [1, 'Jón'],
                        [2, 'Gunna'],
                    ]));
                    this.push(null);
                },
            });
            const transformArraysToObject = (0, streamTransformers_1.arrayToObject)(metadata);
            const objectStream = arrayStream.pipe(transformArraysToObject);
            objectStream.on('error', (err) => {
                try {
                    (0, chai_1.expect)(err.message).to.equal('Expected an array chunk as input');
                    done();
                }
                catch (e) {
                    done(e);
                }
            });
        });
        it('should throw error when column length and stream data length do not match', (done) => {
            const metadata = [
                { name: 'id', typeName: 'INTEGER' },
                { name: 'name', typeName: 'VARCHAR' },
            ];
            const arrayStream = new stream_1.Readable({
                read() {
                    this.push(JSON.stringify([
                        [1, 'Jón', 'extra'],
                        [2, 'Gunna', 'extra'],
                    ]));
                    this.push(null);
                },
            });
            const transformArraysToObject = (0, streamTransformers_1.arrayToObject)(metadata);
            const parseJSON = (0, JSONStream_1.parse)('*');
            const objectStream = arrayStream
                .pipe(parseJSON)
                .pipe(transformArraysToObject);
            objectStream.on('error', (err) => {
                try {
                    (0, chai_1.expect)(err.message).to.equal('Array chunk length 3 does not match columns length 2');
                    done();
                }
                catch (e) {
                    done(e);
                }
            });
        });
    });
});
//# sourceMappingURL=streamTransformers-spec.js.map