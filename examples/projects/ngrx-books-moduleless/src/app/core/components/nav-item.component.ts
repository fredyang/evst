import { Component, Input, Output, EventEmitter } from "@angular/core";
import {
  MatListItem,
  MatListItemIcon,
  MatListItemTitle,
  MatListItemLine,
} from "@angular/material/list";
import { RouterLink } from "@angular/router";
import { MatIcon } from "@angular/material/icon";
import { NgIf } from "@angular/common";

@Component({
  selector: "bc-nav-item",
  template: `
    <a mat-list-item [routerLink]="routerLink" (click)="navigate.emit()">
      <mat-icon matListItemIcon>{{ icon }}</mat-icon>
      <div matListItemTitle><ng-content></ng-content></div>
      <div *ngIf="hint" matListItemLine>{{ hint }}</div>
    </a>
  `,
  styles: [
    `
      a:hover {
        cursor: pointer;
      }
    `,
  ],
  imports: [
    MatListItem,
    RouterLink,
    MatIcon,
    MatListItemIcon,
    MatListItemTitle,
    NgIf,
    MatListItemLine,
  ],
})
export class NavItemComponent {
  @Input() icon = "";
  @Input() hint = "";
  @Input() routerLink: string | any[] = "/";
  @Output() navigate = new EventEmitter<void>();
}
