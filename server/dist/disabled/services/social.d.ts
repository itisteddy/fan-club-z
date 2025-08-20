import type { Club, CreateClub, ClubMember, Comment, CreateComment, Reaction, CreateReaction, PaginationQuery, PaginatedResponse } from '@fanclubz/shared';
interface EnhancedComment extends Comment {
    user: {
        id: string;
        username: string;
        full_name?: string;
        avatar_url?: string;
        is_verified?: boolean;
    };
    is_liked?: boolean;
    is_liked_by_user?: boolean;
    is_own?: boolean;
    is_owned_by_user?: boolean;
    replies?: EnhancedComment[];
}
export declare class SocialService {
    private supabase;
    constructor();
    getPublicClubs(pagination: PaginationQuery, filters?: {
        search?: string;
        category?: string;
    }): Promise<PaginatedResponse<Club>>;
    createClub(userId: string, clubData: CreateClub): Promise<Club>;
    getClubById(clubId: string): Promise<Club | null>;
    joinClub(userId: string, clubId: string): Promise<ClubMember>;
    leaveClub(userId: string, clubId: string): Promise<void>;
    getClubMembers(clubId: string, pagination: PaginationQuery): Promise<PaginatedResponse<ClubMember>>;
    getClubPredictions(clubId: string, pagination: PaginationQuery): Promise<PaginatedResponse<any>>;
    getUserClubs(userId: string, pagination: PaginationQuery): Promise<PaginatedResponse<Club>>;
    getPredictionComments(predictionId: string, pagination: PaginationQuery, userId?: string): Promise<PaginatedResponse<EnhancedComment>>;
    private getPredictionCommentsManual;
    createComment(userId: string, commentData: CreateComment): Promise<EnhancedComment>;
    updateComment(commentId: string, userId: string, content: string): Promise<EnhancedComment>;
    deleteComment(commentId: string, userId: string): Promise<void>;
    toggleCommentLike(userId: string, commentId: string): Promise<void>;
    reportComment(commentId: string, reporterId: string, reason: string, description?: string): Promise<void>;
    toggleReaction(userId: string, reactionData: CreateReaction): Promise<Reaction | null>;
    getPredictionReactions(predictionId: string): Promise<any>;
    getUserActivity(userId: string, pagination: PaginationQuery): Promise<PaginatedResponse<any>>;
    getLeaderboard(options: {
        type: 'global' | 'club';
        period: 'weekly' | 'monthly' | 'all_time';
        clubId?: string;
        pagination: PaginationQuery;
    }): Promise<PaginatedResponse<any>>;
}
export {};
