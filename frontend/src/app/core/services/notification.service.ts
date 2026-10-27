import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import type { Notification } from '../models';
import { getApiUrl } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly notificationsUrl = `${getApiUrl('SHIFTS')}/notifications/`;

  constructor(private http: HttpClient) {}

  /** Fetches the full list of notifications for the current user. */
  getNotifications(): Observable<any> {
    return this.http.get<any>(this.notificationsUrl);
  }

  /** Fetches only the count of unread notifications. */
  getUnreadCount(): Observable<{ unread_count: number }> {
    return this.http.get<{ unread_count: number }>(`${this.notificationsUrl}unread_count/`);
  }

  /** Marks a single notification as read. */
  markAsRead(id: number): Observable<Notification> {
    return this.http.post<Notification>(`${this.notificationsUrl}${id}/mark_read/`, {});
  }

  /** Marks all notifications as read. */
  markAllAsRead(): Observable<any> {
    return this.http.post<any>(`${this.notificationsUrl}mark_all_read/`, {});
  }

  /** Deletes a notification by ID. */
  deleteNotification(id: number): Observable<any> {
    return this.http.delete(`${this.notificationsUrl}${id}/`);
  }

  /** Requests browser push-notification permission. Returns true if granted. */
  async requestPushPermission(): Promise<boolean> {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission !== 'denied') {
      return (await Notification.requestPermission()) === 'granted';
    }
    return false;
  }
}
