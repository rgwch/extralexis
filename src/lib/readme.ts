/*
    The strings here are written in a summary file in each exported patient directory.
*/
import { htmlSkeleton } from "./util"

const readme_html_body = `<div class="container">
    <h2>Inhalt dieses Verzeichnisses</h2>
    <p>Dieses Verzeichnis enthält einen Auszug der Krankengeschichte von <strong>{patient}</strong> per Stichdatum <strong>{date}</strong>.</p>

    <ul>
        <li>Im Wurzelverzeichnis finden Sie die Krankengeschichte in PDF-Format.</li>
        <li>Das Unterverzeichnis <strong>"Rohdaten"</strong> enthält dieselben Daten in besser maschinenlesbarer Form als JSON- und CSV-Dateien zum Import in andere Programme.</li>
        <li>Das Unterverzeichnis <strong>"Eingehende_Dokumente"</strong> enthält alle eingehenden Dokumente, Befunde, Berichte, die in der Krankengeschichte referenziert werden.</li>
        <li>Das Unterverzeichnis <strong>"Ausgehende_Dokumente"</strong> enthält Briefe, Zuweisungen, Rezepte, Arbeitsunfähigkeitzeugnisse etc., die aus der Krankengeschichte heraus erstellt wurden.
        Je nach verwendeter Elexis-Version und -Konfiguration können die Dokumente in verschiedenen Formaten vorliegen:
        <ul>
            <li>PDF-Dateien (.pdf)</li>
            <li>OpenDocument Text-Dateien (.odt)</li>
            <li>Microsoft Word-Dateien (.doc, .docx)</li>
            <li>XML-Dateien (.xml). Diese enthalten das jeweilige Dokument in maschinenlesbarer Form.</li></ul>
        </ul>
        </li>
    </ul>

    <p>Beachten Sie, dass die Zuordnung der Dokumente Eingehend/Ausgehend maschinell erstellt und darum nicht immer perfekt ist.</p>
</div>`

export function readme_html(patient: any, date: string): string {
    const patientLabel = `${patient.bezeichnung1 || "unbekannt"} ${patient.bezeichnung2 || "unbekannt"}`;
    const body = readme_html_body.replace(/{patient}/g, patientLabel).replace(/{date}/g, date);
    return htmlSkeleton(patient, "Krankengeschichte von " + patientLabel, body);
}

export const readme_plaintext = `
Dieses Verzeichnis enthält einen Auszug der Krankengeschichte von {patient} per Stichdatum {date}.

- Im Wurzelverzeichnis finden Sie die Krankengeschichte in PDF-Format. Zum Lesen benötigen Sie einen PDF-Viewer (z.B. Adobe Acrobat Reader).

- Das Unterverzeichnis "Rohdaten" enthält dieselben Daten in besser maschinenlesbarer Form als JSON- und CSV-Dateien zum Import in andere Programme.

- Das Unterverzeichnis "Eingehende_Dokumente" enthält alle eingehenden Dokumente, Befunde, Berichte, die in der Krankengeschichte referenziert werden.

- Das Unterverzeichnis "Ausgehende_Dokumente" enthält Briefe, Zuweisungen, Rezepte, Arbeitsunfähigkeitzeugnisse etc., 
  die aus der Krankengeschichte heraus erstellt wurden. Die Dokumente können in verschiedenen Formaten vorliegen:
    - PDF-Dateien (.pdf)
    - OpenDocument Text-Dateien (.odt)
    - Microsoft Word-Dateien (.doc, .docx)
    - XML-Dateien (.xml). Diese enthalten das jeweilige Dokument in maschinenlesbarer Form.

Beachten Sie, dass die Zuordnung der Dokumente Eingehend/Ausgehend maschinell erstellt und darum nicht immer perfekt ist.
`