import { Component, Output, EventEmitter } from "@angular/core";
import { MatToolbar } from "@angular/material/toolbar";
import { MatIconButton } from "@angular/material/button";
import { MatIcon } from "@angular/material/icon";

@Component({
  selector: "bc-toolbar",
  template: `
    <mat-toolbar color="primary">
      <button mat-icon-button (click)="openMenu.emit()" aria-label="menu">
        <mat-icon>menu</mat-icon>
      </button>
      <ng-content></ng-content>
    </mat-toolbar>
  `,
  imports: [MatToolbar, MatIconButton, MatIcon],
})
export class ToolbarComponent {
  @Output() openMenu = new EventEmitter<void>();
}
