import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SitesStateService } from './sites-state.service';
import { Environment, Site, EnvironmentType, ClusterType } from './models';
import { Observable, map } from 'rxjs';

@Component({
  selector: 'app-add-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-form.component.html',
})
export class AddFormComponent implements OnInit, OnChanges {
  @Input() mode: 'site' | 'environment' | 'cluster' | 'syncCluster' = 'site';

  form!: FormGroup;

  // sites for dropdowns
  sites$: Observable<Site[]> = this.state.allSites$;
  // local only for syncCluster site selection
  localSites$ = this.state.localSite$.pipe(map(local => local ? [local] : []));

  envTypes$ = this.state.environmentTypes$ as Observable<EnvironmentType[]>;
  clusterTypes$ = this.state.clusterTypes$ as Observable<ClusterType[]>;

  environments: Environment[] = [];
  clustersForEnv: { id: number; name: string }[] = [];

  constructor(private fb: FormBuilder, private state: SitesStateService) {}

  ngOnInit(): void {
    this.initForm();

    // site → envs
    this.form.get('siteId')?.valueChanges.subscribe((siteId: number | null) => {
      this.form.get('envId')?.setValue(null);
      this.form.get('clusterId')?.setValue(null);
      this.clustersForEnv = [];

      if (!siteId) {
        this.environments = [];
        this.form.get('envId')?.disable();
        this.form.get('clusterId')?.disable();
        return;
      }
      this.environments = this.state.getEnvironmentsForSite(siteId);
      if (this.mode !== 'site') this.form.get('envId')?.enable();
      this.form.get('clusterId')?.disable();
    });

    // env → clusters
    this.form.get('envId')?.valueChanges.subscribe((envId: number | null) => {
      this.form.get('clusterId')?.setValue(null);
      if (!envId) {
        this.clustersForEnv = [];
        this.form.get('clusterId')?.disable();
        return;
      }
      const clusters = this.state.getClustersForEnv(envId);
      this.clustersForEnv = clusters.map(c => ({ id: c.id, name: c.name }));
      if (this.mode === 'syncCluster') this.form.get('clusterId')?.enable();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['mode'] && !changes['mode'].firstChange) this.initForm();
  }

  private initForm(): void {
    this.form = this.fb.group({
      siteId: [null],
      envId: [null],
      clusterId: [null],      // syncCluster mode
      name: ['', Validators.required],
      environmentTypeId: [null], // environment mode
      clusterTypeId: [null],     // cluster mode
    });

    this.environments = [];
    this.clustersForEnv = [];

    if (this.mode === 'site') {
      this.disable('siteId','envId','environmentTypeId','clusterTypeId','clusterId');
    } else if (this.mode === 'environment') {
      this.enable('siteId','environmentTypeId');
      this.disable('envId','clusterTypeId','clusterId');
      this.form.get('environmentTypeId')?.setValidators([Validators.required]);
      this.form.get('clusterTypeId')?.clearValidators();
    } else if (this.mode === 'cluster') {
      this.enable('siteId','clusterTypeId');
      this.disable('envId','environmentTypeId','clusterId');
      this.form.get('clusterTypeId')?.setValidators([Validators.required]);
      this.form.get('environmentTypeId')?.clearValidators();
    } else if (this.mode === 'syncCluster') {
      this.enable('siteId');
      this.disable('envId','environmentTypeId','clusterTypeId','clusterId');
    }
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private enable(...names: string[]) { names.forEach(n => this.form.get(n)?.enable({ emitEvent: false })); }
  private disable(...names: string[]) { names.forEach(n => this.form.get(n)?.disable({ emitEvent: false })); }

  submit(): void {
    const { name, siteId, envId, environmentTypeId, clusterTypeId, clusterId } = this.form.getRawValue();

    if (this.mode === 'site') {
      this.state.addRemoteSite({ name });
    } else if (this.mode === 'environment' && siteId && environmentTypeId) {
      this.state.addEnvironment(siteId, { name, environmentTypeId });
    } else if (this.mode === 'cluster' && envId && clusterTypeId) {
      this.state.addCluster(envId, { name, clusterTypeId });
    } else if (this.mode === 'syncCluster' && clusterId) {
      this.state.addSyncCluster(clusterId, { name });
    }

    this.form.reset();
    this.initForm();
  }
}
