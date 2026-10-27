import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { getApiUrl } from '../config/api.config';
import { TutorialStep, TUTORIAL_STEPS_BY_ROLE } from '../constants/tutorial-steps.constants';

export type { TutorialStep } from '../constants/tutorial-steps.constants';

@Injectable({
  providedIn: 'root'
})
export class TutorialService {
  private readonly apiUrl = `${getApiUrl('ACCOUNTS')}/users`;
  /** Prevents showing the tutorial more than once per browser session. */
  private tutorialShownInSession = false;

  constructor(private http: HttpClient) {}

  /** Returns true if the tutorial has already been shown during this session. */
  hasTutorialBeenShownInSession(): boolean {
    return this.tutorialShownInSession;
  }

  /** Marks the tutorial as shown so it is not repeated within the same session. */
  markTutorialAsShownInSession(): void {
    this.tutorialShownInSession = true;
  }

  /** Resets the session flag — call this on user switch or logout. */
  resetSessionFlag(): void {
    this.tutorialShownInSession = false;
  }

  /** Sends a request to mark the tutorial as permanently completed for this user. */
  completeTutorial(): Observable<any> {
    return this.http.post(`${this.apiUrl}/complete_tutorial/`, {});
  }

  /** Returns the ordered list of tutorial steps for the given user role. */
  getTutorialSteps(role: string): TutorialStep[] {
    return TUTORIAL_STEPS_BY_ROLE[role] ?? [];
  }
}
