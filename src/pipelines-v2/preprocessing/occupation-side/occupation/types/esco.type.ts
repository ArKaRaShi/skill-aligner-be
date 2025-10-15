export type RawEscoSkill = {
  title?: string;
  uri?: string;
  description?: {
    en?: {
      literal?: string;
    };
  };
  _links?: {
    self?: {
      href: string;
      uri: string;
      title: string;
      skillType: string;
    };
  };
  [key: string]: any;
  // Include other fields as necessary
};

export type RawEscoKnowledge = {
  title?: string;
  uri?: string;
  description?: {
    en?: {
      literal?: string;
    };
  };
  _links?: {
    self?: {
      href: string;
      uri: string;
      title: string;
      skillType: string;
    };
  };
  [key: string]: any;
  // Include other fields as necessary
};

export type RawEscoOccupation = {
  title?: string;
  uri?: string;
  description?: {
    en?: {
      literal?: string;
    };
  };
  _links?: {
    self?: {
      href: string;
      uri: string;
      title: string;
    };
    hasEssentialSkill?: {
      href: string;
      uri: string;
      title: string;
      skillType: string;
    }[];
  };

  [key: string]: any;
  // Include other fields as necessary
};
