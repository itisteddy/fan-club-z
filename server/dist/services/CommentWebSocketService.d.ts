export declare class CommentWebSocketService {
    private io;
    private connectedUsers;
    private userSockets;
    constructor(server: any);
    private setupEventHandlers;
    private setupSupabaseListeners;
    private handleCommentChange;
    private handleCommentLikeChange;
    broadcastToUser(userId: string, event: string, data: any): void;
    broadcastToPrediction(predictionId: string, event: string, data: any): void;
    getOnlineCount(predictionId: string): number;
    getConnectedUsers(): Map<string, Set<string>>;
    getTotalConnections(): number;
    shutdown(): void;
}
