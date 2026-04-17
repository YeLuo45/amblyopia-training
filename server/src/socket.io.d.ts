declare module 'socket.io' {
  import { Server as HttpServer } from 'http';
  
  export interface ServerOptions {
    cors?: any;
    path?: string;
    serveClient?: boolean;
    pingTimeout?: number;
    pingInterval?: number;
    maxHttpBufferSize?: number;
    transports?: string[];
    allowUpgrades?: boolean;
    perMessageDeflate?: boolean | object;
    httpCompression?: boolean | object;
    restify?: (...args: any[]) => any;
  }

  export class Server {
    constructor(httpServer: HttpServer, options?: ServerOptions);
    constructor(options?: ServerOptions);
    listen(port: number, hostname?: string, backlog?: number, callback?: Function): this;
    attach(httpServer: HttpServer, options?: ServerOptions): this;
    on(event: string, callback: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): this;
    to(room: string): this;
    join(room: string): this;
    leave(room: string): this;
    disconnect(close: boolean): this;
    use(fn: (socket: Socket, next: (err?: Error) => void) => void): this;
  }

  export interface Socket {
    id: string;
    handshake: any;
    join(room: string): this;
    leave(room: string): this;
    to(room: string): this;
    emit(event: string, ...args: any[]): this;
    on(event: string, callback: (...args: any[]) => void): this;
    disconnect(close?: boolean): this;
  }
}
