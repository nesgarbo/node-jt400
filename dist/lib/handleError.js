"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = handleError;
const oops_error_1 = require("oops-error");
function handleError(context) {
    return (err) => {
        const errMsg = (err.cause && err.cause.getMessageSync && err.cause.getMessageSync()) ||
            (err.getMessageSync && err.getMessageSync()) ||
            err.message;
        const start = errMsg.indexOf(': ');
        const end = errMsg.indexOf('\n');
        const message = start > 0 && end > 0 ? errMsg.slice(start + 2, end) : errMsg;
        const category = message.toLowerCase().includes('connection') ||
            errMsg.includes('java.net.UnknownHostException')
            ? 'OperationalError'
            : 'ProgrammerError';
        throw new oops_error_1.Oops({
            message,
            context,
            category,
            cause: err,
        });
    };
}
//# sourceMappingURL=handleError.js.map