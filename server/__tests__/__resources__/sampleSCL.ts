export const emptySCL: string = "";

export const emptySCLwithNewLines: string = "\r\n\r\n";

export const simpleSCL1: string = "LIST ENV \"*\" .";

export const complextSCL1_packagenotes: string =
" APPROVE PACKAGE 'XUEYU01REFACTOR'                                                      \r\n" +
"   OPTIONS NOTES = ('this is package note 1',     \r\n" +
"                    'this is \"package \nnote 2',     \r\n" +
"                    \"this is' package note 3\"     \r\n" +
"                    )      .      \r\n" +
"                     ";

export const complextSCL2_2scl: string =
"  DEFINE TYPE 'COPYEXT'\r\n" +
"    TO ENVIRONMENT 'QA3'\r\n" +
"    SYSTEM 'ECPLSYS'\r\n" +
"        STAGE NUMBER 1\r\n" +
"    DESCRIPTION 'Type for environment QA1 stage 1'\r\n" +
"     BASE    LIBRARY  'BST.P7718.EMER.BASE'\r\n" +
"     DELTA   LIBRARY  'BST.P7718.EMER.DELTA'\r\n" +
"     SOURCE OUTPUT LIBRARY 'BST.P7718.EMER.OUTPUT'\r\n" +
"    DO NOT EXPAND INCLUDES\r\n" +
"    DEFAULT PROCESSOR GROUP 'COPYEXT'\r\n" +
"     ELEMENT DELTA FORMAT REVERSE\r\n" +
"    DO NOT COMPRESS BASE\r\n" +
"    REGRESSION PERCENTAGE 50\r\n" +
"     COMPONENT DELTA FORMAT REVERSE\r\n" +
"    REGRESSION SEVERITY INFORMATION\r\n" +
"    FILE EXTENSION 'txt'\r\n" +
"    SOURCE ELEMENT LENGTH 80\r\n" +
"    COMPARE FROM COLUMN 1 TO 72\r\n" +
"    CONSOLIDATE ELEMENT LEVELS\r\n" +
"       CONSOLIDATE ELEMENT AT LEV  96\r\n" +
"    NUMBER OF ELEMENT LEVELS TO CONSOLIDATE  50\r\n" +
"    LANGUAGE 'DATA'\r\n" +
"    LIBRARIAN LANG\r\n" +
"    CONSOLIDATE COMPONENT LEVELS tes\r\n" +
"       CONSOLIDATE COMPONENT AT LEV  96\r\n" +
"    NUMBER OF COMPONENT LEVELS TO CONSOLIDATE  50 .\r\n" +
"  \r\n" +
"\r\n" +
"    ADD ELEMENTS 'PMOVE'\r\n" +
"     FROM DSNAME 'BST.P7718.SOURCE'\r\n" +
"          MEMBER 'PMOVE'\r\n" +
"     TO ENVIRONMENT 'QA1'\r\n" +
"             SYSTEM 'ECPLSYS'\r\n" +
"          SUBSYSTEM 'ECPLSUB'\r\n" +
"               TYPE 'PROCESS'\r\n" +
"    OPTIONS\r\n" +
"            CCID 'CCID'\r\n" +
"            COMMENTS \"Processor for testcase PROMOTION\"\r\n" +
"            UPDATE\r\n" +
" .";

export const invalidSCL_invalidEnding: string = "\n LIST ENV \"*\".";

