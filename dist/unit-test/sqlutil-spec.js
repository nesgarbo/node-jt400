'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const sqlutil_1 = require("../lib/sqlutil");
const chai_1 = require("chai");
describe('sql helpers', () => {
    it('should create sql statement', () => {
        const records = [
            {
                foo: 'bar',
                baz: 123,
            },
            {
                foo: 'ble',
                baz: 456,
            },
        ];
        (0, chai_1.expect)((0, sqlutil_1.toInsertSql)('myTable', records)).to.equal('INSERT INTO myTable (foo, baz) VALUES(?, ?), (?, ?)');
    });
});
//# sourceMappingURL=sqlutil-spec.js.map