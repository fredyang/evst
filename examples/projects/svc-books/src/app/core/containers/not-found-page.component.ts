import { Component } from "@angular/core";
import {
  MatCard,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from "@angular/material/card";
import { MatButton } from "@angular/material/button";
import { RouterLink } from "@angular/router";

@Component({
  selector: "bc-not-found-page",
  template: `
    <mat-card>
      <mat-card-title>404: Not Found</mat-card-title>
      <mat-card-content>
        <p>Hey! It looks like this page doesn't exist yet.</p>
      </mat-card-content>
      <mat-card-actions>
        <button mat-raised-button color="primary" routerLink="/">
          Take Me Home
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [
    `
      :host {
        text-align: center;
      }

      mat-card-title,
      mat-card-content {
        margin-top: 1rem;
      }

      mat-card-actions {
        justify-content: center;
        margin-top: 1rem;
      }
    `,
  ],
  imports: [
    MatCard,
    MatCardTitle,
    MatCardContent,
    MatCardActions,
    MatButton,
    RouterLink,
  ],
})
export class NotFoundPageComponent {}
