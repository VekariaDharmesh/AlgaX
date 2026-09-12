export interface Farm {
  id: string;
  name: string;
  location: string;
  status: 'active' | 'inactive';
}

export const DEMO_FARM: Farm = {
  id: 'f-1',
  name: 'GreenRiver Farm',
  location: 'Imperial Valley, CA',
  status: 'active',
};
