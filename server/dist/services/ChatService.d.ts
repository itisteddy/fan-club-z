import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
interface ConnectedUser {
    socketId: string;
    userId: string;
    username: string;
    joinedAt: Date;
    predictionId?: string;
}
export declare class ChatService {
    private io;
    private httpServer;
    private connectedUsers;
    private typingUsers;
    constructor(httpServer: HttpServer);
    private getAllowedOrigins;
    private logServerInfo;
    private setupSocketHandlers;
    private loadMessageHistory;
    private getParticipants;
    private updateParticipantStatus;
    private addTypingUser;
    private removeTypingUser;
    private setupPeriodicCleanup;
    getHttpServer(): HttpServer<typeof import("http").IncomingMessage, typeof import("http").ServerResponse>;
    getIO(): Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
    getConnectedUsers(): Map<string, ConnectedUser>;
    getUsersInPrediction(predictionId: string): ConnectedUser[];
    getConnectionStats(): {
        totalConnections: number;
        authenticatedUsers: number;
        activeRooms: number;
        typingUsers: number;
        platform: string;
        environment: string | undefined;
    };
    sendSystemMessage(predictionId: string, content: string): Promise<void>;
}
export default ChatService;
