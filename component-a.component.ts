import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SitesStateService } from './sites-state.service';
import { SitesDisplayComponent } from './sites-display.component';
import { AddFormComponent } from './add-form.component';

@Component({
  selector: 'app-component-a',
  standalone: true,
  imports: [CommonModule, FormsModule, AddFormComponent, SitesDisplayComponent],
  templateUrl: './component-a.component.html',
})
export class ComponentA {
  mode: 'site' | 'environment' | 'cluster' | 'syncCluster' = 'site';

  localSite$ = this.state.localSite$;
  remoteSites$ = this.state.remoteSites$;

  constructor(private state: SitesStateService) {}
}
