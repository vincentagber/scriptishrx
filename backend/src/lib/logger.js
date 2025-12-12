const winston = require('winston');

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

const level = () => {
    const env = process.env.NODE_ENV || 'development';
    return env === 'development' ? 'debug' : 'warn';
};

const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

winston.addColors(colors);

const format = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    winston.format.colorize({ all: true }),
    winston.format.printf(
        (info) => `${info.timestamp} ${info.level}: ${info.message}`,
    ),
);

const googleCloudFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

const transports = [
    new winston.transports.Console({
        format: process.env.NODE_ENV === 'production' ? googleCloudFormat : format,
    }),
    new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.json(),
    }),
    new winston.transports.File({
        filename: 'logs/all.log',
        format: winston.format.json(),
    }),
];

const logger = winston.createLogger({
    level: level(),
    levels,
    transports,
});

module.exports = logger;
