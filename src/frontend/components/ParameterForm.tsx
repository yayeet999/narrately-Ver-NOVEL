import React, { useState } from 'react';
import { NovelParameters, Genre, Theme, StoryStructure, ConflictType, ResolutionStyle, SettingType, Character } from '../../services/novel/NovelParameters';
import { Logger } from '../../services/utils/Logger';
import { GenreOptions, ThemeOptions, CharacterArchetypes, SettingOptions, ConflictTypeOptions, ResolutionStyleOptions, CulturalFrameworks } from '../../services/novel/NovelParameters';

interface ParameterFormProps {
  onSubmit: (params: NovelParameters) => void;
}

const ParameterForm: React.FC<ParameterFormProps> = ({ onSubmit }) => {
  const [parameters, setParameters] = useState<Partial<NovelParameters>>({
    novel_length: '50k-100k',
    chapter_structure: 'fixed',
    average_chapter_length: 2000,
    chapter_naming_style: 'numbered',
    primary_genre: 'High Fantasy',
    pov: 'third_omniscient',
    tone_formality: 3,
    tone_descriptive: 3,
    dialogue_balance: 3,
    setting_type: 'Fantasy',
    world_complexity: 3,
    cultural_depth: 3,
    story_structure: 'Hero\'s Journey',
    conflict_types: ['person_vs_person'],
    resolution_style: 'Conclusive',
    description_density: 3,
    pacing_overall: 3,
    pacing_variance: 3,
    emotional_intensity: 3,
    metaphor_frequency: 2,
    flashback_usage: 1,
    foreshadowing_intensity: 2,
    language_complexity: 3,
    sentence_structure: 'varied',
    paragraph_length: 'medium',
    violence_level: 2,
    adult_content_level: 1,
    profanity_level: 0,
    controversial_handling: 'careful',
    characters: [{
      role: 'protagonist',
      archetype: 'The Hero',
      age_range: '25-35',
      background_archetype: 'Orphan Adventurer',
      arc_type: 'coming_of_age',
      relationships: ['Friend of Protagonist']
    }],
    story_description: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>, field: keyof NovelParameters) => {
    const value = e.target.value;
    setParameters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConflictChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value as ConflictType);
    setParameters(prev => ({
      ...prev,
      conflict_types: selectedOptions
    }));
  };

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>, field: 'primary_theme' | 'secondary_theme') => {
    const value = e.target.value as Theme;
    setParameters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>, field: 'primary_genre' | 'secondary_genre') => {
    const value = e.target.value as Genre;
    setParameters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCharacterChange = (index: number, field: keyof Character, value: string) => {
    const updatedCharacters = [...(parameters.characters || [])];
    updatedCharacters[index] = {
      ...updatedCharacters[index],
      [field]: value
    };
    setParameters(prev => ({
      ...prev,
      characters: updatedCharacters
    }));
  };

  const addCharacter = () => {
    const updatedCharacters = [...(parameters.characters || [])];
    updatedCharacters.push({
      role: 'supporting',
      archetype: 'The Mentor',
      age_range: '40-60',
      background_archetype: 'Wise Sage',
      arc_type: 'static',
      relationships: []
    });
    setParameters(prev => ({
      ...prev,
      characters: updatedCharacters
    }));
  };

  const removeCharacter = (index: number) => {
    const updatedCharacters = [...(parameters.characters || [])];
    updatedCharacters.splice(index, 1);
    setParameters(prev => ({
      ...prev,
      characters: updatedCharacters
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    Logger.info('Submitting novel parameters:', parameters);
    onSubmit(parameters as NovelParameters);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Core Framework */}
      <div>
        <label className="block font-semibold">Story Title (Optional)</label>
        <input
          type="text"
          value={parameters.title || ''}
          onChange={(e) => handleChange(e, 'title')}
          className="w-full border rounded p-2"
          placeholder="Enter your preferred title"
        />
      </div>

      <div>
        <label className="block font-semibold">Novel Length</label>
        <select
          value={parameters.novel_length}
          onChange={(e) => handleChange(e, 'novel_length')}
          className="w-full border rounded p-2"
        >
          <option value="50k-100k">50,000 - 100,000 words</option>
          <option value="100k-150k">100,000 - 150,000 words</option>
          <option value="150k+">150,000+ words</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold">Chapter Structure</label>
        <select
          value={parameters.chapter_structure}
          onChange={(e) => handleChange(e, 'chapter_structure')}
          className="w-full border rounded p-2"
        >
          <option value="fixed">Fixed Length Chapters</option>
          <option value="variable">Variable Length Chapters</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold">Average Chapter Length (words)</label>
        <input
          type="number"
          value={parameters.average_chapter_length}
          onChange={(e) => handleChange(e, 'average_chapter_length')}
          className="w-full border rounded p-2"
          min={500}
          max={5000}
        />
      </div>

      <div>
        <label className="block font-semibold">Chapter Naming Style</label>
        <select
          value={parameters.chapter_naming_style}
          onChange={(e) => handleChange(e, 'chapter_naming_style')}
          className="w-full border rounded p-2"
        >
          <option value="numbered">Numbered</option>
          <option value="titled">Titled</option>
          <option value="both">Both</option>
        </select>
      </div>

      {/* Genre System */}
      <div>
        <label className="block font-semibold">Primary Genre</label>
        <select
          value={parameters.primary_genre}
          onChange={(e) => handleGenreChange(e, 'primary_genre')}
          className="w-full border rounded p-2"
        >
          {Object.keys(GenreOptions).map((genreGroup) => (
            <optgroup label={genreGroup} key={genreGroup}>
              {GenreOptions[genreGroup as Genre].map((subGenre) => (
                <option value={subGenre} key={subGenre}>{subGenre}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-semibold">Secondary Genre (Optional)</label>
        <select
          value={parameters.secondary_genre || ''}
          onChange={(e) => handleGenreChange(e, 'secondary_genre')}
          className="w-full border rounded p-2"
        >
          <option value="">None</option>
          {Object.keys(GenreOptions).map((genreGroup) => (
            <optgroup label={genreGroup} key={genreGroup}>
              {GenreOptions[genreGroup as Genre].map((subGenre) => (
                <option value={subGenre} key={subGenre}>{subGenre}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Theme Categories */}
      <div>
        <label className="block font-semibold">Primary Theme</label>
        <select
          value={parameters.primary_theme}
          onChange={(e) => handleThemeChange(e, 'primary_theme')}
          className="w-full border rounded p-2"
        >
          {ThemeOptions.map((theme) => (
            <option value={theme} key={theme}>{theme}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-semibold">Secondary Theme (Optional)</label>
        <select
          value={parameters.secondary_theme || ''}
          onChange={(e) => handleThemeChange(e, 'secondary_theme')}
          className="w-full border rounded p-2"
        >
          <option value="">None</option>
          {ThemeOptions.map((theme) => (
            <option value={theme} key={theme}>{theme}</option>
          ))}
        </select>
      </div>

      {/* Characters */}
      <div>
        <label className="block font-semibold">Characters</label>
        {parameters.characters && parameters.characters.map((char, index) => (
          <div key={index} className="border rounded p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-semibold">Character {index + 1}</h4>
              {parameters.characters!.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeCharacter(index)}
                  className="text-red-500"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <label className="block font-medium">Name (Optional)</label>
                <input
                  type="text"
                  value={char.name || ''}
                  onChange={(e) => handleCharacterChange(index, 'name', e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="Enter character name"
                />
              </div>

              <div>
                <label className="block font-medium">Role</label>
                <select
                  value={char.role}
                  onChange={(e) => handleCharacterChange(index, 'role', e.target.value)}
                  className="w-full border rounded p-2"
                >
                  <option value="protagonist">Protagonist</option>
                  <option value="antagonist">Antagonist</option>
                  <option value="supporting">Supporting</option>
                </select>
              </div>

              <div>
                <label className="block font-medium">Archetype</label>
                <select
                  value={char.archetype}
                  onChange={(e) => handleCharacterChange(index, 'archetype', e.target.value)}
                  className="w-full border rounded p-2"
                >
                  {CharacterArchetypes.map((arch) => (
                    <option value={arch} key={arch}>{arch}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium">Age Range</label>
                <input
                  type="text"
                  value={char.age_range}
                  onChange={(e) => handleCharacterChange(index, 'age_range', e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="e.g., 25-35"
                />
              </div>

              <div>
                <label className="block font-medium">Background Archetype</label>
                <input
                  type="text"
                  value={char.background_archetype}
                  onChange={(e) => handleCharacterChange(index, 'background_archetype', e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="e.g., Orphan Adventurer"
                />
              </div>

              <div>
                <label className="block font-medium">Arc Type</label>
                <select
                  value={char.arc_type}
                  onChange={(e) => handleCharacterChange(index, 'arc_type', e.target.value)}
                  className="w-full border rounded p-2"
                >
                  <option value="redemption">Redemption</option>
                  <option value="fall">Fall from Grace</option>
                  <option value="coming_of_age">Coming of Age</option>
                  <option value="internal_discovery">Internal Discovery</option>
                  <option value="static">Static/Unchanging</option>
                </select>
              </div>

              <div>
                <label className="block font-medium">Relationships</label>
                <input
                  type="text"
                  value={char.relationships.join(', ')}
                  onChange={(e) => handleCharacterChange(index, 'relationships', e.target.value)}
                  className="w-full border rounded p-2"
                  placeholder="e.g., Friend of Protagonist, Mentor"
                />
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addCharacter}
          className="bg-green-500 text-white px-4 py-2 rounded"
          disabled={(parameters.characters?.length || 0) >= 10}
        >
          Add Character
        </button>
      </div>

      {/* Setting Parameters */}
      <div>
        <label className="block font-semibold">Setting Type</label>
        <select
          value={parameters.setting_type}
          onChange={(e) => handleChange(e, 'setting_type')}
          className="w-full border rounded p-2"
        >
          {SettingOptions.map((setting) => (
            <option value={setting} key={setting}>{setting}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-semibold">World Complexity (1-5)</label>
        <input
          type="number"
          value={parameters.world_complexity}
          onChange={(e) => handleChange(e, 'world_complexity')}
          className="w-full border rounded p-2"
          min={1}
          max={5}
        />
      </div>

      <div>
        <label className="block font-semibold">Cultural Depth (1-5)</label>
        <input
          type="number"
          value={parameters.cultural_depth}
          onChange={(e) => handleChange(e, 'cultural_depth')}
          className="w-full border rounded p-2"
          min={1}
          max={5}
        />
      </div>

      <div>
        <label className="block font-semibold">Cultural Framework</label>
        <select
          value={parameters.cultural_framework || ''}
          onChange={(e) => handleChange(e, 'cultural_framework')}
          className="w-full border rounded p-2"
        >
          <option value="">Select Cultural Framework</option>
          {CulturalFrameworks.map((framework) => (
            <option value={framework} key={framework}>{framework}</option>
          ))}
        </select>
      </div>

      {/* Narrative Foundation */}
      <div>
        <label className="block font-semibold">Point of View (POV)</label>
        <select
          value={parameters.pov}
          onChange={(e) => handleChange(e, 'pov')}
          className="w-full border rounded p-2"
        >
          <option value="first">First Person</option>
          <option value="third_limited">Third Person Limited</option>
          <option value="third_omniscient">Third Person Omniscient</option>
          <option value="multiple">Multiple POVs</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold">Tone Formality (1-5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={parameters.tone_formality}
          onChange={(e) => handleChange(e, 'tone_formality')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Tone Descriptiveness (1-5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={parameters.tone_descriptive}
          onChange={(e) => handleChange(e, 'tone_descriptive')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Dialogue Balance (1-5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={parameters.dialogue_balance}
          onChange={(e) => handleChange(e, 'dialogue_balance')}
          className="w-full"
        />
      </div>

      {/* Plot Architecture */}
      <div>
        <label className="block font-semibold">Story Structure</label>
        <select
          value={parameters.story_structure}
          onChange={(e) => handleChange(e, 'story_structure')}
          className="w-full border rounded p-2"
        >
          {(['Hero\'s Journey','Three-Act Structure','Nonlinear','Parallel','Episodic','Circular','Framing Device','In Medias Res'] as StoryStructure[]).map((structure) => (
            <option value={structure} key={structure}>{structure}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-semibold">Conflict Types</label>
        <select
          multiple
          value={parameters.conflict_types}
          onChange={handleConflictChange}
          className="w-full border rounded p-2 h-32"
        >
          {ConflictTypeOptions.map((conflict) => (
            <option value={conflict} key={conflict}>{conflict.replace(/_/g, ' ')}</option>
          ))}
        </select>
        <small className="text-gray-500">Hold Ctrl (Windows) or Command (Mac) to select multiple.</small>
      </div>

      <div>
        <label className="block font-semibold">Resolution Style</label>
        <select
          value={parameters.resolution_style}
          onChange={(e) => handleChange(e, 'resolution_style')}
          className="w-full border rounded p-2"
        >
          {ResolutionStyleOptions.map((style) => (
            <option value={style} key={style}>{style}</option>
          ))}
        </select>
      </div>

      {/* Writing Style Controls */}
      <div>
        <label className="block font-semibold">Description Density (1-5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={parameters.description_density}
          onChange={(e) => handleChange(e, 'description_density')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Pacing Overall (1-5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={parameters.pacing_overall}
          onChange={(e) => handleChange(e, 'pacing_overall')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Pacing Variance (1-5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={parameters.pacing_variance}
          onChange={(e) => handleChange(e, 'pacing_variance')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Emotional Intensity (1-5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={parameters.emotional_intensity}
          onChange={(e) => handleChange(e, 'emotional_intensity')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Metaphor Frequency (0-5)</label>
        <input
          type="range"
          min={0}
          max={5}
          value={parameters.metaphor_frequency}
          onChange={(e) => handleChange(e, 'metaphor_frequency')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Flashback Usage (0-5)</label>
        <input
          type="range"
          min={0}
          max={5}
          value={parameters.flashback_usage}
          onChange={(e) => handleChange(e, 'flashback_usage')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Foreshadowing Intensity (0-5)</label>
        <input
          type="range"
          min={0}
          max={5}
          value={parameters.foreshadowing_intensity}
          onChange={(e) => handleChange(e, 'foreshadowing_intensity')}
          className="w-full"
        />
      </div>

      {/* Technical Preferences */}
      <div>
        <label className="block font-semibold">Language Complexity (1-5)</label>
        <input
          type="range"
          min={1}
          max={5}
          value={parameters.language_complexity}
          onChange={(e) => handleChange(e, 'language_complexity')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Sentence Structure</label>
        <select
          value={parameters.sentence_structure}
          onChange={(e) => handleChange(e, 'sentence_structure')}
          className="w-full border rounded p-2"
        >
          <option value="varied">Varied</option>
          <option value="consistent">Consistent</option>
          <option value="simple">Simple</option>
          <option value="complex">Complex</option>
        </select>
      </div>

      <div>
        <label className="block font-semibold">Paragraph Length</label>
        <select
          value={parameters.paragraph_length}
          onChange={(e) => handleChange(e, 'paragraph_length')}
          className="w-full border rounded p-2"
        >
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </select>
      </div>

      {/* Content Controls */}
      <div>
        <label className="block font-semibold">Violence Level (0-5)</label>
        <input
          type="range"
          min={0}
          max={5}
          value={parameters.violence_level}
          onChange={(e) => handleChange(e, 'violence_level')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Adult Content Level (0-5)</label>
        <input
          type="range"
          min={0}
          max={5}
          value={parameters.adult_content_level}
          onChange={(e) => handleChange(e, 'adult_content_level')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Profanity Level (0-5)</label>
        <input
          type="range"
          min={0}
          max={5}
          value={parameters.profanity_level}
          onChange={(e) => handleChange(e, 'profanity_level')}
          className="w-full"
        />
      </div>

      <div>
        <label className="block font-semibold">Controversial Topics Handling</label>
        <select
          value={parameters.controversial_handling}
          onChange={(e) => handleChange(e, 'controversial_handling')}
          className="w-full border rounded p-2"
        >
          <option value="avoid">Avoid</option>
          <option value="careful">Careful</option>
          <option value="direct">Direct</option>
        </select>
      </div>

      {/* Story Description */}
      <div>
        <label className="block font-semibold">Story Description Details</label>
        <textarea
          value={parameters.story_description}
          onChange={(e) => handleChange(e, 'story_description')}
          className="w-full border rounded p-2 h-32"
          placeholder="Provide detailed story description..."
          required
        ></textarea>
      </div>

      {/* Submit Button */}
      <div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Generate Novel
        </button>
      </div>
    </form>
  );
};

export default ParameterForm; 