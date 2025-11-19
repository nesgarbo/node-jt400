"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStandardInsertList = exports.createInsertListInOneStatment = void 0;
const sqlutil_1 = require("./sqlutil");
const createInsertListInOneStatment = (jt400) => (tableName, idColumn, list) => {
    if (!list || list.length === 0) {
        return Promise.resolve([]);
    }
    const sql = 'SELECT ' +
        idColumn +
        ' FROM NEW TABLE(' +
        (0, sqlutil_1.toInsertSql)(tableName, list) +
        ')';
    const params = list.map(Object.values).reduce((arr, valueArr) => {
        return arr.concat(valueArr);
    }, []);
    return jt400.query(sql, params).then((idList) => {
        return idList.map((idObj) => idObj[idColumn.toUpperCase()]);
    });
};
exports.createInsertListInOneStatment = createInsertListInOneStatment;
const createStandardInsertList = (jt400) => (tableName, _, list) => {
    const idList = [];
    const pushToIdList = idList.push.bind(idList);
    return list
        .map((record) => {
        return {
            sql: (0, sqlutil_1.toInsertSql)(tableName, [record]),
            values: Object.values(record),
        };
    })
        .reduce((soFar, sqlObj) => {
        return soFar
            .then(() => {
            return jt400.insertAndGetId(sqlObj.sql, sqlObj.values);
        })
            .then(pushToIdList);
    }, Promise.resolve())
        .then(() => {
        return idList;
    });
};
exports.createStandardInsertList = createStandardInsertList;
//# sourceMappingURL=insertList.js.map