import { BaseConnection, InsertList, Param } from './baseConnection.types.js'
import { toInsertSql } from './sqlutil.js'

export type CreateInsertList = (connection: BaseConnection) => InsertList
export const createInsertListInOneStatment: CreateInsertList =
  (jt400) => (tableName, idColumn, list) => {
    if (!list || list.length === 0) {
      return Promise.resolve([])
    }
    const firstKeys = Object.keys(list[0]).join(',')
    if (list.some((r) => Object.keys(r).join(',') !== firstKeys)) {
      return Promise.reject(new Error('All records must have the same keys in the same order'))
    }
    const sql =
      'SELECT ' +
      idColumn +
      ' FROM NEW TABLE(' +
      toInsertSql(tableName, list) +
      ')'
    const params = list.map(Object.values).reduce((arr: Param[], valueArr) => {
      return arr.concat(valueArr as Param[])
    }, [])

    return jt400.query<Record<string, number>>(sql, params).then((idList) => {
      return idList.map((idObj) => idObj[idColumn.toUpperCase()])
    })
  }

export const createStandardInsertList: CreateInsertList =
  (jt400) => (tableName, _, list) => {
    const idList: number[] = []

    return list
      .map((record) => ({
        sql: toInsertSql(tableName, [record]),
        values: Object.values(record) as Param[],
      }))
      .reduce<Promise<void>>((soFar, sqlObj) => {
        return soFar
          .then(() => jt400.insertAndGetId(sqlObj.sql, sqlObj.values))
          .then((id) => { idList.push(id) })
      }, Promise.resolve())
      .then(() => idList)
  }
