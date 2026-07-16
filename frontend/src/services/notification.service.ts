import apiClient from './api.client';

export interface Notification {
    _id: string;
    title: string;
    message: string;
    type: string;
    recipient: string;
    recipientIds: string[];
    relatedUser?: {
        _id: string;
        name: string;
        email: string;
        profileImage?: string;
    };
    relatedProvider?: {
        _id: string;
        specialization: string;
    };
    relatedAppointment?: any;
    relatedPayment?: any;
    isRead: boolean;
    readBy: Array<{
        userId: string;
        readAt: Date;
    }>;
    priority: 'low' | 'medium' | 'high';
    status: 'sent' | 'scheduled' | 'failed';
    scheduledFor?: Date;
    createdAt: string;
    updatedAt: string;
}

export interface NotificationResponse {
    success: boolean;
    notifications: Notification[];
    totalPages: number;
    currentPage: number;
    total: number;
    unreadCount: number;
}

export interface UnreadCountResponse {
    success: boolean;
    count: number;
}

class NotificationService {
    // Get admin notifications
    async getAdminNotifications(params?: {
        page?: number;
        limit?: number;
        type?: string;
        isRead?: boolean;
        priority?: string;
    }): Promise<NotificationResponse> {
        const response = await apiClient.get('/notifications/admin', { params });
        return response.data;
    }

    // Get my notifications (for any user)
    async getMyNotifications(params?: {
        page?: number;
        limit?: number;
        type?: string;
        isRead?: boolean;
    }): Promise<NotificationResponse> {
        const response = await apiClient.get('/notifications/my', { params });
        return response.data;
    }

    // Get unread count
    async getUnreadCount(): Promise<number> {
        const response = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
        return response.data.count;
    }

    // Mark notification as read
    async markAsRead(id: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.put(`/notifications/${id}/read`);
        return response.data;
    }

    // Mark all as read
    async markAllAsRead(): Promise<{ success: boolean; message: string; count: number }> {
        const response = await apiClient.put('/notifications/read-all');
        return response.data;
    }

    // Create notification (admin only)
    async createNotification(data: {
        title: string;
        message: string;
        type: string;
        recipient: 'admin' | 'provider' | 'patient' | 'all';
        recipientIds?: string[];
        relatedUser?: string;
        relatedProvider?: string;
        relatedAppointment?: string;
        relatedPayment?: string;
        priority?: 'low' | 'medium' | 'high';
        scheduledFor?: Date;
    }): Promise<{ success: boolean; notification: Notification }> {
        const response = await apiClient.post('/notifications', data);
        return response.data;
    }

    // Delete notification (admin only)
    async deleteNotification(id: string): Promise<{ success: boolean; message: string }> {
        const response = await apiClient.delete(`/notifications/${id}`);
        return response.data;
    }
}

export const notificationService = new NotificationService();
