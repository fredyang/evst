import { Component, EventEmitter, Input, Output } from "@angular/core";
import { MatSidenav } from "@angular/material/sidenav";
import { MatNavList } from "@angular/material/list";

@Component({
  selector: "bc-sidenav",
  template: `
    <mat-sidenav
      #sidenav
      [opened]="open"
      (keydown.escape)="sidenav.close()"
      (closedStart)="closeMenu.emit()"
      disableClose
    >
      <mat-nav-list>
        <ng-content></ng-content>
      </mat-nav-list>
    </mat-sidenav>
  `,
  styles: [
    `
      mat-sidenav {
        width: 300px;
      }
    `,
  ],
  imports: [MatSidenav, MatNavList],
})
export class SidenavComponent {
  @Input() open = false;
  @Output() closeMenu = new EventEmitter<void>();
}
